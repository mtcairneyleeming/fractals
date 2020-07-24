#![feature(proc_macro_hygiene, decl_macro)]

mod geom;
mod simple;
#[macro_use]
extern crate rocket;
extern crate rocket_contrib;
use geom::{Segment, Tri3d};

use rocket_contrib::json::*;
use rocket_contrib::serve::StaticFiles;

use std::time::Instant;

#[post("/thin/<n>/<draw_axiom>", format = "application/json", data = "<segments>")]
fn thin(segments: Json<Vec<Vec<Segment>>>, n: i32, draw_axiom: bool) -> Json<Vec<Tri3d>> {
    let start = Instant::now();
    let data = segments.into_inner();
    let tris = simple::simple_thin(data, n, draw_axiom);
    let res = Json(simple::fix_tris_n(tris, 5));
    println!("Calculated thin in {:.2}s", start.elapsed().as_secs_f32());
    return res;
}

#[post("/thick/<n>/<draw_axiom>/<thickness>", data = "<segments>")]
fn thick(segments: Json<Vec<Vec<Segment>>>, n: i32, draw_axiom: bool, thickness: f64) -> Json<Vec<Tri3d>> {
    let start = Instant::now();
    let data = segments.into_inner();
    let tris = simple::simple_thick(data, n, draw_axiom, thickness);
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
