#![feature(proc_macro_hygiene, decl_macro)]
extern crate log;
extern crate simplelog;
use simplelog::*;
mod geom;
mod simple;
#[macro_use]
extern crate rocket;
extern crate rocket_contrib;
use geom::{Layer, Line3d, Tri3d};
use simple::*;
use stl_io::*;

use rocket_contrib::json::*;
use rocket_contrib::serve::StaticFiles;
use serde::Deserialize;
use std::time::Instant;

fn tris_to_binary_stl(tris: Vec<Tri3d>) -> Vec<u8> {
    let mesh: Vec<Triangle> = tris
        .into_iter()
        .map(|t| stl_io::Triangle {
            normal: [1.0, 0.0, 0.0],
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
#[derive(Deserialize)]
struct Data {
    data: (Vec<Vec<Line3d>>, HoleOptions),
}

#[post(
    "/stl?<thicken>&<thickness>&<curve>&<max_curve_frac>&<curve_steps_mult>&<init_steps>&<step_scale>",
    format = "application/json",
    data = "<tuple>"
)]
fn stl(
    tuple: Json<Data>,
    thicken: bool,
    thickness: Option<f64>,
    curve: Option<bool>,
    max_curve_frac: Option<f64>,
    curve_steps_mult: Option<f64>,
    init_steps: i64,
    step_scale: f64,
) -> Vec<u8> {
    let (lines, hole_options) = tuple.into_inner().data;
    let layers = lines
        .iter()
        .map(|l| Layer::<Line3d> { lines: l.to_vec() })
        .collect();
    let start = Instant::now();
    let possibly_curved = if curve.is_some() && curve.unwrap() {
        simple::curve_layers(layers, max_curve_frac.unwrap(), curve_steps_mult.unwrap())
    } else {
        layers
    };
    let simplified = simple::simplify(possibly_curved);

    let tris: Vec<Tri3d> = if thicken {
        let thickened = simplified.iter().map(|l| l.thicken(thickness.unwrap())).collect();
        simple::develop(thickened, hole_options, init_steps, step_scale)
    } else {
        simple::develop(simplified, hole_options, init_steps, step_scale)
    };
    println!(
        "Calculated {} in {:.2}s",
        if thicken { "thick" } else { "thin" },
        start.elapsed().as_secs_f32()
    );
    tris_to_binary_stl(tris)
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
