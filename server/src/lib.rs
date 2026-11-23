//! Fractals server: turns the wireframe layers of a developing fractal into a binary STL.
//!
//! `POST /api/stl?...` takes a MessagePack body `[layers, holes]` and returns the STL bytes. Everything
//! else is served from the static directory (the built frontend).
mod geom;
mod simple;

use geom::{Layer, Line3d, Point3d, Tri3d};
use log::info;
use rocket::data::{Limits, ToByteUnit};
use rocket::fs::FileServer;
use rocket::http::Status;
use rocket::serde::msgpack::MsgPack;
use rocket::{post, routes, Build, Rocket};
use serde::{Deserialize, Serialize};
pub use simple::HoleOptions;
use std::path::PathBuf;
use std::time::Instant;

/// Environment variable naming the directory of built frontend files.
pub const STATIC_DIR_ENV: &str = "FRACTALS_STATIC_DIR";

/// Where the built frontend is: `$FRACTALS_STATIC_DIR` if set, otherwise `web` in the working directory
/// (the deployed layout), otherwise `../web/dist` (a development checkout, running from `server/`).
pub fn static_dir() -> PathBuf {
    if let Some(dir) = std::env::var_os(STATIC_DIR_ENV) {
        return PathBuf::from(dir);
    }
    for candidate in ["web", "../web/dist"] {
        if std::path::Path::new(candidate).is_dir() {
            return PathBuf::from(candidate);
        }
    }
    PathBuf::from("web")
}

pub fn tris_to_binary_stl(tris: Vec<Tri3d>) -> Vec<u8> {
    let mesh: Vec<stl_io::Triangle> = tris
        .into_iter()
        .map(|t| stl_io::Triangle {
            normal: stl_io::Normal::new([t.n.x as f32, t.n.y as f32, t.n.z as f32]),
            vertices: [
                stl_io::Vertex::new([t.a.x as f32, t.a.y as f32, t.a.z as f32]),
                stl_io::Vertex::new([t.b.x as f32, t.b.y as f32, t.b.z as f32]),
                stl_io::Vertex::new([t.c.x as f32, t.c.y as f32, t.c.z as f32]),
            ],
        })
        .collect();
    let mut binary_stl = Vec::<u8>::new();
    stl_io::write_stl(&mut binary_stl, mesh.iter()).unwrap();
    binary_stl
}

/// The request body: wireframe layers (each line is `[x1, y1, z1, x2, y2, z2]`) and the hole options.
#[derive(Deserialize, Serialize)]
pub struct Data {
    pub layers: Vec<Vec<[f64; 6]>>,
    pub holes: HoleOptions,
}

/// The query parameters of `/api/stl`.
#[derive(Debug, Clone, Default)]
pub struct Params {
    pub thicken: bool,
    pub top_thickness: Option<f64>,
    pub bottom_thickness: Option<f64>,
    pub curve: Option<bool>,
    pub max_curve_frac: Option<f64>,
    pub curve_steps_mult: Option<f64>,
    pub init_steps: i64,
    pub step_scale: f64,
    pub extrude: bool,
    pub extrude_dist: Option<f64>,
}

#[post(
    "/stl?<thicken>&<top_thickness>&<bottom_thickness>&<curve>&<max_curve_frac>&<curve_steps_mult>&<init_steps>&<step_scale>&<extrude>&<extrude_dist>",
    format = "msgpack",
    data = "<tuple>"
)]
#[allow(clippy::too_many_arguments)]
async fn stl(
    tuple: MsgPack<Data>,
    thicken: bool,
    top_thickness: Option<f64>,
    bottom_thickness: Option<f64>,
    curve: Option<bool>,
    max_curve_frac: Option<f64>,
    curve_steps_mult: Option<f64>,
    init_steps: i64,
    step_scale: f64,
    extrude: bool,
    extrude_dist: Option<f64>,
) -> Result<Vec<u8>, Status> {
    let params = Params {
        thicken,
        top_thickness,
        bottom_thickness,
        curve,
        max_curve_frac,
        curve_steps_mult,
        init_steps,
        step_scale,
        extrude,
        extrude_dist,
    };
    // The geometry is CPU-bound, so keep it off the async workers. A panic inside it (the old server
    // answered those with 500 too) comes back as a join error.
    rocket::tokio::task::spawn_blocking(move || {
        let tris = create_triangles(tuple.into_inner(), &params)?;
        Ok(tris_to_binary_stl(tris))
    })
    .await
    .map_err(|_| Status::InternalServerError)?
}

/// Builds the triangles for a request. `Err` means a required parameter was missing (HTTP 400).
pub fn create_triangles(data: Data, p: &Params) -> Result<Vec<Tri3d>, Status> {
    let mut layers: Vec<Layer<Line3d>> = data
        .layers
        .iter()
        .map(|l| {
            Layer::<Line3d>::new(
                l.iter()
                    .map(|line| {
                        Line3d::new(
                            Point3d::new(line[0], line[1], line[2]),
                            Point3d::new(line[3], line[4], line[5]),
                        )
                    })
                    .collect(),
            )
        })
        .collect();
    let start = Instant::now();
    layers = simple::simplify(layers);

    let missing = |_| Status::BadRequest;
    let extrude_dist = if p.extrude {
        p.extrude_dist.ok_or(()).map_err(missing)?
    } else {
        0.0
    };
    let curve = p.curve == Some(true);

    let tris: Vec<Tri3d> = if p.thicken {
        let t = p.top_thickness.ok_or(()).map_err(missing)?;
        let b = p.bottom_thickness.ok_or(()).map_err(missing)?;
        let mut thickened = vec![];
        for i in 0..layers.len() {
            thickened.push(layers[i].thicken(t - (t - b) * (i as f64) / (layers.len() as f64 - 1.0)))
        }
        if curve {
            let frac = p.max_curve_frac.ok_or(()).map_err(missing)?;
            let mult = p.curve_steps_mult.ok_or(()).map_err(missing)?;
            thickened = simple::curve_layers(thickened, frac, mult)
        };
        info!("Done curve generation");
        simple::develop(thickened, data.holes, p.init_steps, p.step_scale, extrude_dist)
    } else {
        if curve {
            let frac = p.max_curve_frac.ok_or(()).map_err(missing)?;
            let mult = p.curve_steps_mult.ok_or(()).map_err(missing)?;
            layers = simple::curve_layers(layers, frac, mult)
        };
        simple::develop(layers, data.holes, p.init_steps, p.step_scale, extrude_dist)
    };
    info!(
        "Calculated {} in {:.2}s",
        if p.thicken { "thick" } else { "thin" },
        start.elapsed().as_secs_f32()
    );
    Ok(tris)
}

/// The whole app: the API under `/api` and the built frontend under `/`.
/// Address and port come from Rocket's usual `ROCKET_ADDRESS` / `ROCKET_PORT`.
pub fn build_rocket(static_dir: PathBuf) -> Rocket<Build> {
    // Same body limit as before (Rocket's default for msgpack, 1 MiB), written out so it's visible.
    let figment = rocket::Config::figment().merge(("limits", Limits::default().limit("msgpack", 1.mebibytes())));
    rocket::custom(figment)
        .mount("/api", routes![stl])
        .mount("/", FileServer::from(static_dir))
}
