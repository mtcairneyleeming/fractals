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
    tris.extend(T::draw_layer(&layers[0].lines(), 1.0, false));

    tris.extend(T::draw_layer(&layers.last().unwrap().lines(), 1.0, true));
    let mut layer_steps = init_steps;
    let mut hole_scale = 1; //only useful if using HoleOptions::Everywhere
    for i in 1..layers.len() {
        let prev_layer = &layers[(i - 1) as usize];
        let curr_layer = &layers[i as usize];

        tris.extend(
            curr_layer
                .first()
                .endcap(prev_layer.first(), 0.0, layer_steps, None, true),
        );
        tris.extend(
            curr_layer
                .last()
                .endcap(prev_layer.last(), 1.0, layer_steps, None, false),
        );

        // find where the holes should go (if we're using HoleRegions::Everywhere)
        let (hole_regions, new_hole_scale) = calc_hole_regions(&hole_options, hole_scale);
        hole_scale = new_hole_scale;

        // calculate for use later
        let mut current_position = 0.0;
        let layer_length: f64 = curr_layer.length();


        for line in curr_layer.lines() {
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
                            tris.extend(prev_line.join_to_with_hole(new_part, frame_factor, false));
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

                        let mut split_lines = vec![];
                        let mut endcaps_to_draw = vec![];

                        let skips = Some((
                            (frame_factor * layer_steps as f64).round() as i64,
                            ((1.0 - frame_factor) * layer_steps as f64).round() as i64,
                        ));

                        let mut j = 1;
                        while start_frac >= hole_regions[j] {
                            j += 1
                        }
                        // so start_frac is in [hole_regions[j-1], hole_regions[j])

                        // add an endcap at start if necessary, and now draw up to j, not including the
                        // end cap.
                        if start_frac == hole_regions[j - 1] && j - 1 > 0 {
                            endcaps_to_draw.push((hole_regions[j - 1], j % 2 == 0))
                        }


                        if end_frac < hole_regions[j] {
                            split_lines.push((start_frac, end_frac, j));
                        } else {
                            split_lines.push((start_frac, hole_regions[j], j));

                            j += 1;
                            // the invariant is that all sections prior to hole_regions[j-1] not including
                            // the endcap there, have been drawn successfully.
                            // note this can draw everything incl the last section.
                            while j < hole_regions.len() && hole_regions[j] < end_frac {
                                // so this full hole/space is in this line part
                                split_lines.push((hole_regions[j - 1], hole_regions[j], j));
                                endcaps_to_draw.push((hole_regions[j - 1], j % 2 == 0));
                                j += 1;
                            }

                            if j < hole_regions.len() {
                                // now draw from hole_regions[curr_change_index] to end_frac (if
                                // they're not the same)
                                // the next endcap will be dealt with by the next line/ the very end
                                // of the layer
                                endcaps_to_draw.push((hole_regions[j - 1], j % 2 == 0));

                                split_lines.push((hole_regions[j - 1], end_frac, j));
                            }
                        }

                        for (s, e, j) in split_lines {
                            let these_skips = if j % 2 == 0 { skips } else { None };
                            let prev =
                                prev_line.section(layer_frac_to_part_frac(s), layer_frac_to_part_frac(e));

                            let next =
                                new_part.section(layer_frac_to_part_frac(s), layer_frac_to_part_frac(e));


                            tris.extend(prev.join_non_parallel(next, layer_steps, these_skips, false));
                        }


                        for (e, dir) in endcaps_to_draw {
                            let new_tris = new_part.endcap(
                                prev_line,
                                layer_frac_to_part_frac(e),
                                layer_steps,
                                skips,
                                dir,
                            );
                            tris.extend(new_tris);
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
