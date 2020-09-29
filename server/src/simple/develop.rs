use super::holes::*;
use crate::geom::*;

pub fn develop<T>(
    layers: Vec<Layer<T>>,
    hole_options: HoleOptions,
    init_steps: i64,
    step_scale: f64,
) -> Vec<Tri3d>
where
    T: Line + Copy,
{
    let mut tris: Vec<Tri3d> = Vec::new();
    tris.extend(T::draw_layer(&layers[0].lines));

    tris.extend(T::draw_layer(&layers.last().unwrap().lines));
    let mut layer_steps = init_steps;
    let mut hole_scale = 1; //only useful if using HoleOptions::Everywhere
    for i in 1..layers.len() {
        let prev_layer = &layers[(i - 1) as usize];
        let curr_layer = &layers[i as usize];

        tris.extend(T::draw_edges(&curr_layer.lines, &prev_layer.lines, layer_steps));

        // find where the holes should go (if we're using HoleRegions::Everywhere)
        let (hole_regions, new_hole_scale) = calc_hole_regions(&hole_options, hole_scale);
        hole_scale = new_hole_scale;

        // calculate for use later
        let mut current_position = 0.0;
        let layer_length: f64 = curr_layer.length();


        for line in &curr_layer.lines {
            // find section of previous layer to join to self line

            /* note the section may be multiple lines as there are no enforced
               rules that say the previous iteration should be less complicated
               than self one (even though self will be true for any sensible
               fractal)
            */
            let start_frac = (current_position) / layer_length;
            let end_frac = (current_position + line.length()) / layer_length;
            let prev_lines = prev_layer.get_section(start_frac, end_frac);

            let total_prev_length: f64 = prev_lines.iter().map(|l| l.length()).sum();
            let mut length_along_prev = 0.0;
            for prev_line in prev_lines {
                let new_start_frac = length_along_prev / total_prev_length;
                let new_end_frac = (length_along_prev + prev_line.length()) / total_prev_length;

                let new_part = line.section(new_start_frac, new_end_frac);

                match hole_options {
                    HoleOptions::None => {
                        tris.extend(prev_line.join_to(new_part, layer_steps));
                    }
                    HoleOptions::ParallelOnly { frame_factor } => {
                        if prev_line.is_parallel_to(new_part) && new_part.length() > 0.1 {
                            tris.extend(prev_line.join_to_with_hole(new_part, frame_factor));
                        } else {
                            tris.extend(prev_line.join_to(new_part, layer_steps));
                        }
                    }
                    HoleOptions::Everywhere {
                        num_holes: _,
                        ratio: _,
                        scaling_factor: _,
                        frame_factor,
                    } => {
                        let start_frac = current_position / layer_length;
                        let end_frac = (current_position + new_part.length()) / layer_length;

                        let layer_frac_to_part_frac =
                            |layer_frac: f64| (layer_frac - start_frac) / (end_frac - start_frac);
                        let draw = |first: f64, second: f64, hole: bool, tris: &mut Vec<Tri3d>| {
                            let skips = if hole {
                                Some((
                                    (frame_factor * layer_steps as f64).round() as i64,
                                    ((1.0 - frame_factor) * layer_steps as f64).round() as i64,
                                ))
                            } else {
                                None
                            };
                            let prev = prev_line
                                .section(layer_frac_to_part_frac(first), layer_frac_to_part_frac(second));

                            let next = new_part
                                .section(layer_frac_to_part_frac(first), layer_frac_to_part_frac(second));


                            tris.extend(prev.join_non_parallel(next, layer_steps, skips));
                        };

                        let mut j = 1;
                        while start_frac >= hole_regions[j] {
                            j += 1
                        }
                        // so start_frac is in [hole_regions[j-1], hole_regions[j])

                        if end_frac < hole_regions[j] {
                            // this line is fully within this hole/space region
                            draw(start_frac, end_frac, j % 2 == 0, &mut tris)
                        } else {
                            // we've just added an endcap if necessary at start_frac
                            draw(start_frac, hole_regions[j], j % 2 == 0, &mut tris);
                            /* the loop below works as follows:
                                    - the invariant is that everything up to hole_regions[curr_change_index] has been drawn properly
                                    - thus each iteration must fully draw [ho
                                it draws all the regions from hole_regions[j] up to and including the last complete one before end_frac
                            */
                            // index of the region up to which we have already drawn
                            // check to make sure we haven't reached end, and if not whether the
                            // whole hole/solid region is in this line part
                            while j + 1 < hole_regions.len() && hole_regions[j + 1] < end_frac {
                                // so this full hole/space is in this line part
                                draw(hole_regions[j], hole_regions[j + 1], j % 2 == 0, &mut tris);
                                j += 1;
                            }
                            // now draw from hole_regions[curr_change_index] to end_frac (if
                            // they're not the same)
                            // the next endcap will be dealt with by the next line/ the very end
                            // of the layer
                            if end_frac < 1.0 - 1e-8 && end_frac - hole_regions[j] > 1e-7 {
                                draw(hole_regions[j], end_frac, j % 2 == 1, &mut tris);
                            }
                        }
                    }
                }
                length_along_prev += prev_line.length();
                current_position += new_part.length();
            }
        }
        layer_steps = (layer_steps as f64 * step_scale).round() as i64;
    }
    return tris;
}
