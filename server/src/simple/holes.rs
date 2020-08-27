use serde::Deserialize;

#[derive(Deserialize, Debug)]
pub enum HoleOptions {
    None,
    ParallelOnly {
        frame_factor: f64,
    },
    Everywhere {
        hole_frac: f64,
        spacing_frac: f64,
        scaling_factor: f64,
        frame_factor: f64,
    },
}


pub(super) fn calc_hole_regions(hole_options: &HoleOptions, hole_scale: f64) -> (Vec<f64>, f64) {
    if let HoleOptions::Everywhere {
        hole_frac,
        spacing_frac,
        scaling_factor,
        frame_factor: _,
    } = hole_options
    {
        let mut regions = vec![];
        let mut pos = 0.0;
        regions.push(0.0);
        let mut prev_was_hole = false;
        pos += 0.5 * spacing_frac * hole_scale;
        regions.push(pos);
        let mut cont = true;
        while cont {
            pos += if prev_was_hole { spacing_frac } else { hole_frac } * hole_scale;
            if pos < 1.0 {
                regions.push(pos);
                prev_was_hole = !prev_was_hole;
            } else {
                cont = false
            }
        }
        regions.push(1.0);
        (regions, hole_scale * scaling_factor)
    } else {
        (vec![], 0.0)
    }
}
