//! Shared helpers for the integration tests: the fixture cases (see `fixtures/README`-style notes in
//! `golden.rs`).
#![allow(dead_code)]
use serde::Deserialize;
use server::{Data, HoleOptions, Params};

#[derive(Deserialize)]
pub struct Q {
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

#[derive(Deserialize)]
pub struct Case {
    pub name: String,
    pub layers: Vec<Vec<[f64; 6]>>,
    pub holes: HoleOptions,
    pub q: Q,
}

impl Case {
    pub fn params(&self) -> Params {
        let q = &self.q;
        Params {
            thicken: q.thicken,
            top_thickness: q.top_thickness,
            bottom_thickness: q.bottom_thickness,
            curve: q.curve,
            max_curve_frac: q.max_curve_frac,
            curve_steps_mult: q.curve_steps_mult,
            init_steps: q.init_steps,
            step_scale: q.step_scale,
            extrude: q.extrude,
            extrude_dist: q.extrude_dist,
        }
    }
    pub fn data(self) -> Data {
        Data { layers: self.layers, holes: self.holes }
    }
}

pub fn cases() -> Vec<Case> {
    let path = concat!(env!("CARGO_MANIFEST_DIR"), "/tests/fixtures/cases.json");
    serde_json::from_str(&std::fs::read_to_string(path).unwrap()).unwrap()
}

pub fn golden() -> serde_json::Value {
    let path = concat!(env!("CARGO_MANIFEST_DIR"), "/tests/fixtures/golden.json");
    serde_json::from_str(&std::fs::read_to_string(path).unwrap()).unwrap()
}

/// Replaces every NaN float in a binary STL with one fixed bit pattern: the old code's output for some
/// degenerate inputs contains NaNs, and their sign/payload bits differ between compilers.
pub fn canonical_nans(stl: &[u8]) -> (Vec<u8>, usize) {
    let mut out = stl.to_vec();
    let n = u32::from_le_bytes(stl[80..84].try_into().unwrap()) as usize;
    let mut nans = 0;
    for i in 0..n {
        for k in 0..12 {
            let off = 84 + 50 * i + 4 * k;
            if f32::from_le_bytes(stl[off..off + 4].try_into().unwrap()).is_nan() {
                out[off..off + 4].copy_from_slice(&0x7fc0_0000u32.to_le_bytes());
                nans += 1;
            }
        }
    }
    (out, nans)
}

/// Summary of a binary STL: (triangle count, bbox min, bbox max) over the vertices.
pub fn stl_summary(stl: &[u8]) -> (usize, [f32; 3], [f32; 3]) {
    let n = u32::from_le_bytes(stl[80..84].try_into().unwrap()) as usize;
    let mut min = [f32::MAX; 3];
    let mut max = [f32::MIN; 3];
    for i in 0..n {
        let base = 84 + 50 * i;
        for v in 0..3 {
            for k in 0..3 {
                let off = base + 12 + 12 * v + 4 * k;
                let x = f32::from_le_bytes(stl[off..off + 4].try_into().unwrap());
                if !x.is_nan() {
                    min[k] = min[k].min(x);
                    max[k] = max[k].max(x);
                }
            }
        }
    }
    (n, min, max)
}
