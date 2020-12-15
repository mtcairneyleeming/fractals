#![feature(proc_macro_hygiene, decl_macro)]
extern crate log;
extern crate simplelog;
use simplelog::*;
mod geom;
mod simple;
#[macro_use]
extern crate rocket;
extern crate rocket_contrib;
use geom::{Layer, Line3d, Point3d, Tri3d};
use log::info;
use rocket_contrib::msgpack::MsgPack;
use rocket_contrib::serve::StaticFiles;
use serde::{Deserialize, Serialize};
use simple::*;
use std::time::Instant;
use stl_io::*;

fn tris_to_binary_stl(tris: Vec<Tri3d>) -> Vec<u8> {
    let mesh: Vec<Triangle> = tris
        .into_iter()
        .map(|t| stl_io::Triangle {
            normal: [t.n.x as f32, t.n.y as f32, t.n.z as f32],
            vertices: [
                [t.a.x as f32, t.a.y as f32, t.a.z as f32],
                [t.b.x as f32, t.b.y as f32, t.b.z as f32],
                [t.c.x as f32, t.c.y as f32, t.c.z as f32],
            ],
        })
        .collect();
    let mut binary_stl = Vec::<u8>::new();
    stl_io::write_stl(&mut binary_stl, mesh.iter()).unwrap();
    binary_stl
}


#[derive(Deserialize, Serialize)]
struct Data {
    layers: Vec<Vec<[f64; 6]>>,
    holes: HoleOptions,
}
#[post(
    "/stl?<thicken>&<top_thickness>&<bottom_thickness>&<curve>&<max_curve_frac>&<curve_steps_mult>&<init_steps>&<step_scale>",
    format = "msgpack",
    data = "<tuple>"
)]
fn stl(
    tuple: MsgPack<Data>,
    thicken: bool,
    top_thickness: Option<f64>,
    bottom_thickness: Option<f64>,
    curve: Option<bool>,
    max_curve_frac: Option<f64>,
    curve_steps_mult: Option<f64>,
    init_steps: i64,
    step_scale: f64,
) -> Vec<u8> {
    tris_to_binary_stl(create_triangles(
        tuple,
        thicken,
        top_thickness,
        bottom_thickness,
        curve,
        max_curve_frac,
        curve_steps_mult,
        init_steps,
        step_scale,
    ))
}

fn create_triangles(
    tuple: MsgPack<Data>,
    thicken: bool,
    top_thickness: Option<f64>,
    bottom_thickness: Option<f64>,
    curve: Option<bool>,
    max_curve_frac: Option<f64>,
    curve_steps_mult: Option<f64>,
    init_steps: i64,
    step_scale: f64,
) -> Vec<Tri3d> {
    let data = tuple.into_inner();

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

    let tris: Vec<Tri3d> = if thicken {
        let mut thickened = vec![];
        let t = top_thickness.unwrap();
        let b = bottom_thickness.unwrap();
        for i in 0..layers.len() {
            thickened.push(layers[i].thicken(t - (t - b) * (i as f64) / (layers.len() as f64 - 1.0)))
        }
        if curve.is_some() && curve.unwrap() {
            thickened = simple::curve_layers(thickened, max_curve_frac.unwrap(), curve_steps_mult.unwrap())
        };
        info!("Done curve generation");
       
        simple::develop(thickened, data.holes, init_steps, step_scale)
    } else {
        if curve.is_some() && curve.unwrap() {
            layers = simple::curve_layers(layers, max_curve_frac.unwrap(), curve_steps_mult.unwrap())
        };
        simple::develop(layers, data.holes, init_steps, step_scale)
    };
    info!(
        "Calculated {} in {:.2}s",
        if thicken { "thick" } else { "thin" },
        start.elapsed().as_secs_f32()
    );
    tris
}

fn main() {
    TermLogger::init(LevelFilter::Info, Config::default(), TerminalMode::Mixed).unwrap();

    rocket::ignite()
        .mount("/api", routes![stl])
        .mount(
            "/",
            StaticFiles::from(concat!(env!("CARGO_MANIFEST_DIR"), "/../web/dist")),
        )
        .launch();
}
