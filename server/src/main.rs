#![feature(proc_macro_hygiene, decl_macro)]

mod geom;
mod simple;
#[macro_use]
extern crate rocket;
extern crate rocket_contrib;
use geom::{Segment, Tri3d};
use simple::curves;
use stl_io::*;

use rocket_contrib::json::*;
use rocket_contrib::serve::StaticFiles;

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

#[post(
    "/stl?<thicken>&<thickness>&<add_holes>&<frame_factor>&<curve>&<max_curve_frac>&<steps_multiplier>",
    format = "application/json",
    data = "<segments>"
)]
fn stl(
    segments: Json<Vec<Vec<Segment>>>,
    thicken: bool,
    thickness: Option<f64>,
    add_holes: bool,
    frame_factor: Option<f64>,
    curve: Option<bool>,
    max_curve_frac: Option<f64>,
    steps_multiplier: Option<f64>,
) -> Vec<u8> {
    let start = Instant::now();
    let data = segments.into_inner();
    let processed = if curve.is_some() && curve.unwrap() {
        curves::curve_segments(data, max_curve_frac.unwrap(), steps_multiplier.unwrap())
    } else {
        data
    };
    let tris: Vec<Tri3d> = if thicken {
        simple::simple_thick(
            simple::thicken_segments(processed, thickness.unwrap()),
            add_holes,
            frame_factor,
        )
    } else {
        simple::simple_thin(processed, add_holes, frame_factor)
    };
    println!("Calculated thin in {:.2}s", start.elapsed().as_secs_f32());
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
