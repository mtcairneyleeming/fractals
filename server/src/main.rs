#![feature(proc_macro_hygiene, decl_macro)]

mod geom;
mod simple;
#[macro_use]
extern crate rocket;
extern crate rocket_contrib;
use geom::{Segment, Tri3d};
use simple::curves;

use rocket_contrib::json::*;
use rocket_contrib::serve::StaticFiles;

use std::time::Instant;

#[post(
    "/thin?<curve>&<max_curve_frac>&<steps_multiplier>",
    format = "application/json",
    data = "<segments>"
)]
fn thin(
    segments: Json<Vec<Vec<Segment>>>,
    curve: Option<bool>,
    max_curve_frac: Option<f64>,
    steps_multiplier: Option<f64>,
) -> Json<Vec<Tri3d>> {
    let start = Instant::now();
    let data = segments.into_inner();
    let processed = if curve.is_some() && curve.unwrap() {
        curves::curve_segments(data, max_curve_frac.unwrap(), steps_multiplier.unwrap())
    } else {
        data
    };
    let tris = simple::simple_thin(processed);
    let res = Json(simple::fix_tris_n(tris, 5));
    println!("Calculated thin in {:.2}s", start.elapsed().as_secs_f32());
    return res;
}

#[post(
    "/thick?<curve>&<max_curve_frac>&<steps_multiplier>&<thickness>",
    format = "application/json",
    data = "<segments>"
)]
fn thick(
    segments: Json<Vec<Vec<Segment>>>,
    curve: Option<bool>,
    max_curve_frac: Option<f64>,
    steps_multiplier: Option<f64>,
    thickness: f64,
) -> Json<Vec<Tri3d>> {
    let start = Instant::now();
    let data = segments.into_inner();
    let processed = if curve.is_some() && curve.unwrap() {
        curves::curve_segments(data, max_curve_frac.unwrap(), steps_multiplier.unwrap())
    } else {
        data
    };
    let segments = simple::thicken_segments(processed, thickness);
    let tris = simple::simple_thick(segments);
    let res = Json(tris);
    println!("Calculated thick in {:.2}s", start.elapsed().as_secs_f32());
    return res;
}

fn main() {
    rocket::ignite()
        .mount("/api", routes![thin, thick])
        .mount(
            "/",
            StaticFiles::from(concat!(env!("CARGO_MANIFEST_DIR"), "/../web/dist")),
        )
        .launch();
}
