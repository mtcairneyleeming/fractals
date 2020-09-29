use serde::{Deserialize, Serialize};

#[derive(Deserialize, Debug, Serialize)]
pub enum HoleOptions {
    None,
    ParallelOnly {
        frame_factor: f64,
    },
    Everywhere {
        num_holes: i64,
        ratio: f64,
        scaling_factor: i64,
        frame_factor: f64,
    },
}


pub(super) fn calc_hole_regions(hole_options: &HoleOptions, hole_scale: i64) -> (Vec<f64>, i64) {
    if let HoleOptions::Everywhere {
        num_holes: orig_num,
        ratio,
        scaling_factor,
        frame_factor: _,
    } = hole_options
    {
        let num_holes = orig_num * hole_scale;
        let pair_frac = 1.0 / num_holes as f64;
        let spacing_frac = 1.0 / (1.0 + ratio) * pair_frac;
        let hole_frac = ratio / (1.0 + ratio) * pair_frac;
        let mut regions = vec![];
        let mut pos = 0.0;
        regions.push(0.0);
        pos += 0.5 * spacing_frac;
        regions.push(pos);

        for _ in 1..num_holes {
            pos += hole_frac;
            regions.push(pos);
            pos += spacing_frac;
            regions.push(pos);
        }
        pos += hole_frac;
        regions.push(pos);
        regions.push(1.0);
        (regions, hole_scale * scaling_factor)
    } else {
        (vec![], 0)
    }
}
