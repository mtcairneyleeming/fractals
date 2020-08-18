#![feature(proc_macro_hygiene, decl_macro)]

mod geom;
mod simple;
#[macro_use]
extern crate rocket;
extern crate rocket_contrib;
use geom::{Segment, Tri3d};
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
    data: (Vec<Vec<Segment>>, HoleOptions),
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
    let (segments, hole_options) = tuple.into_inner().data;
    let start = Instant::now();
    let processed = if curve.is_some() && curve.unwrap() {
        curves::curve_segments(segments, max_curve_frac.unwrap(), curve_steps_mult.unwrap())
    } else {
        segments
    };
    let tris: Vec<Tri3d> = if thicken {
        simple::simple_thick(
            simple::thicken_segments(processed, thickness.unwrap()),
            hole_options,
            init_steps,
            step_scale,
        )
    } else {
        simple::simple_thin(processed, hole_options, init_steps, step_scale)
    };
    println!(
        "Calculated {} in {:.2}s",
        if thicken { "thick" } else { "thin" },
        start.elapsed().as_secs_f32()
    );
    tris_to_binary_stl(tris)
}

fn main() {
    rocket::ignite()
        .mount("/api", routes![stl])
        .mount(
            "/",
            StaticFiles::from(concat!(env!("CARGO_MANIFEST_DIR"), "/../web/dist")),
        )
        .launch();
}
