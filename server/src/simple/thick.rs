use super::holes::*;
use super::util::*;
use crate::geom::*;
use log::info;

pub fn simple_thick(
    layers: Vec<ThickSegment>,
    hole_options: HoleOptions,
    init_steps: i64,
    step_scale: f64,
) -> Vec<Tri3d> {
    if layers.len() == 0 {
        panic!("No  layers to draw")
    }

    // output
    let mut tris: Vec<Tri3d> = Vec::new();
    tris.extend(draw_layer_face(&layers[0]));

    tris.extend(draw_layer_face(&layers[layers.len() - 1]));

    let mut hole_scale = 1.0; //only useful if using HoleOptions::Everywhere
    let mut layer_steps = init_steps;
    for layer in 1..layers.len() {
        let prev_layer = &layers[(layer - 1) as usize];
        let curr_layer = &layers[layer as usize];

        if prev_layer.orig_lines.len() == 0 || curr_layer.orig_lines.len() == 0 {
            panic!("No lines to draw!!!!!!")
        }

        draw_endcaps(curr_layer, prev_layer, &mut tris, layer_steps);

        // update hole_scale (only for HoleOptions::Everywhere)
        let (hole_regions, new_hole_scale) = calc_hole_regions(&hole_options, hole_scale);
        hole_scale = new_hole_scale;

        // calculate for use later
        let mut current_position = 0.0;
        let layer_length: f64 = curr_layer.orig_length;

        // for (key, group) in &curr_layer.into_iter().group_by(|seg|
        // seg.orig_prev_index) {     let prev_segment = &prev_layer[key];
        //     let group_segments: Vec<&ThickSegment> = group.collect();
        //     let mut group_length = 0.0;

        //     for segment in &group_segments {
        //         group_length += segment.orig_length()
        //     }
        //     let group_start = current_position;
        // there is one offset line on each side for every original line
        for i in 0..curr_layer.orig_lines.len() {
            let orig_line = curr_layer.orig_lines[i];
            let inner_line = curr_layer.inner_lines[i];
            let outer_line = curr_layer.outer_lines[i];
            // find section of segment on prev level to join to self line

            /* note the section may be multiple lines as there are no enforced
               rules that say the previous iteration should be less complicated
               than this one (even though this will be true for most sensible
               fractals)
            */
            let start_frac = (current_position) / layer_length;
            let end_frac = (current_position + orig_line.length) / layer_length;
            let (prev_orig_lines, prev_inner_lines, prev_outer_lines) =
                prev_layer.get_section(start_frac, end_frac);
            let total_prev_length = prev_orig_lines.iter().fold(0.0, |s, l| s + l.length);
            let mut length_along_prev = 0.0;
            for i in 0..prev_orig_lines.len() {
                // fractions into orig_line
                let new_start_frac = length_along_prev / total_prev_length;
                let new_end_frac = (length_along_prev + prev_orig_lines[i].length) / total_prev_length;
                let new_inner_part = inner_line.get_section(new_start_frac, new_end_frac);
                let new_outer_part = outer_line.get_section(new_start_frac, new_end_frac);
                let new_orig_part = orig_line.get_section(new_start_frac, new_end_frac);

                match hole_options {
                    HoleOptions::None => {
                        tris.extend(draw_many_joins(prev_inner_lines[i], new_inner_part, layer_steps));
                        tris.extend(draw_many_joins(prev_outer_lines[i], new_outer_part, layer_steps));
                    }
                    HoleOptions::ParallelOnly { frame_factor } => {
                        if are_parallel(prev_inner_lines[i], new_inner_part)
                            && are_parallel(prev_outer_lines[i], new_inner_part)
                            && new_orig_part.length > 0.1 * curr_layer.orig_length
                        {
                            tris.extend(build_thick_hole(
                                new_inner_part,
                                new_outer_part,
                                prev_inner_lines[i],
                                prev_outer_lines[i],
                                frame_factor,
                            ));
                        } else {
                            tris.extend(draw_many_joins(prev_inner_lines[i], new_inner_part, layer_steps));
                            tris.extend(draw_many_joins(prev_outer_lines[i], new_outer_part, layer_steps));
                        }
                    }
                    HoleOptions::Everywhere {
                        hole_frac: _,
                        spacing_frac: _,
                        scaling_factor: _,
                        frame_factor,
                    } => {
                        // Note certain assumptions about hole_regions:
                        //      - the first entry is 0.0, the last entry 1.0
                        //      - thus the second entry is the end of the first solid section, and so on
                        //      - so an index like j below being odd means the section preceding it is
                        //        solid
                        let start_frac = current_position / layer_length;
                        let end_frac = (current_position + new_orig_part.length) / layer_length;

                        // info!("To draw: {} -> {}", start_frac, end_frac);
                        // #region endcap, solid, hole methods for drawing to tris
                        let layer_frac_to_part_frac =
                            |layer_frac: f64| (layer_frac - start_frac) / (end_frac - start_frac);
                        let draw = |first: f64, second: f64, hole: bool, tris: &mut Vec<Tri3d>| {
                            let (skip_start, skip_end) = if hole {
                                (
                                    Some((frame_factor * layer_steps as f64).round() as i64),
                                    Some(((1.0 - frame_factor) * layer_steps as f64).round() as i64),
                                )
                            } else {
                                (None, None)
                            };
                            info!("\t\tSkipping: {:?}, {:?}, hole {}", skip_start, skip_end, hole);
                            let prev_inner = Line3d::new(
                                prev_inner_lines[i].point(layer_frac_to_part_frac(first)),
                                prev_inner_lines[i].point(layer_frac_to_part_frac(second)),
                            );
                            let prev_outer = Line3d::new(
                                prev_outer_lines[i].point(layer_frac_to_part_frac(first)),
                                prev_outer_lines[i].point(layer_frac_to_part_frac(second)),
                            );
                            let next_inner = Line3d::new(
                                new_inner_part.point(layer_frac_to_part_frac(first)),
                                new_inner_part.point(layer_frac_to_part_frac(second)),
                            );
                            let next_outer = Line3d::new(
                                new_outer_part.point(layer_frac_to_part_frac(first)),
                                new_outer_part.point(layer_frac_to_part_frac(second)),
                            );
                            tris.extend(join_non_parallel(
                                prev_inner,
                                next_inner,
                                layer_steps,
                                skip_start,
                                skip_end,
                            ));
                            tris.extend(join_non_parallel(
                                prev_outer,
                                next_outer,
                                layer_steps,
                                skip_start,
                                skip_end,
                            ));
                            if hole {
                                let vertical_side_thickness = frame_factor as f64 / layer_steps as f64;
                                // joins to make solid
                                let outer_start = Line3d::new(prev_outer.start, next_outer.start);
                                let inner_start = Line3d::new(prev_inner.start, next_inner.start);
                                let outer_end = Line3d::new(prev_outer.end, next_outer.end);
                                let inner_end = Line3d::new(prev_inner.end, next_inner.end);
                                tris.extend_from_slice(&join_planar_lines(
                                    Line3d::new(
                                        outer_start.point(vertical_side_thickness),
                                        outer_end.point(vertical_side_thickness),
                                    ),
                                    Line3d::new(
                                        inner_start.point(vertical_side_thickness),
                                        inner_end.point(vertical_side_thickness),
                                    ),
                                ));
                                tris.extend_from_slice(&join_planar_lines(
                                    Line3d::new(
                                        inner_start.point(1.0 - vertical_side_thickness),
                                        inner_end.point(1.0 - vertical_side_thickness),
                                    ),
                                    Line3d::new(
                                        outer_start.point(1.0 - vertical_side_thickness),
                                        outer_end.point(1.0 - vertical_side_thickness),
                                    ),
                                ));
                            }
                        };
                        let endcap = |layer_frac: f64, tris: &mut Vec<Tri3d>| {
                            let f = layer_frac_to_part_frac(layer_frac);
                            let prev_inner = prev_inner_lines[i].point(f);

                            let prev_outer = prev_outer_lines[i].point(f);
                            let new_inner = new_inner_part.point(f);
                            let new_outer = new_outer_part.point(f);
                            let outer = Line3d::new(prev_outer, new_outer);
                            let inner = Line3d::new(prev_inner, new_inner);

                            let vertical_side_thickness = frame_factor as f64 / layer_steps as f64;

                            tris.extend_from_slice(&join_planar_lines(
                                Line3d::new(
                                    outer.point(vertical_side_thickness),
                                    inner.point(vertical_side_thickness),
                                ),
                                Line3d::new(
                                    outer.point(1.0 - vertical_side_thickness),
                                    inner.point(1.0 - vertical_side_thickness),
                                ),
                            ));
                        };
                        // #endregion

                        for k in 1..hole_regions.len() {
                            if hole_regions[k] >= start_frac && hole_regions[k] < end_frac {
                                endcap(hole_regions[k], &mut tris)
                            }
                        }

                        if start_frac > 1.0 - 1e-9 {
                            continue;
                        }

                        let mut j = 1;
                        while start_frac >= hole_regions[j] {
                            j += 1
                        }

                        // so start_frac is in [hole_regions[j-1], hole_regions[j])


                        if end_frac < hole_regions[j] {
                            // this line is fully within this hole/space region
                            info!(
                                "\tDrew {}->{} fully within [{}, {}), hole? {}, j {}",
                                start_frac,
                                end_frac,
                                hole_regions[j - 1],
                                hole_regions[j],
                                j & 1 == 0,
                                j
                            );

                            draw(start_frac, end_frac, j & 1 == 0, &mut tris)
                        } else {
                            // we've just added an endcap if necessary at start_frac
                            info!(
                                "\tDrew start to first change: {}->{} hole? {}, j {}",
                                start_frac,
                                hole_regions[j],
                                j & 1 == 0,
                                j
                            );
                            draw(start_frac, hole_regions[j], j & 1 == 0, &mut tris);
                            /* the loop below works as follows:
                                    - the invariant is that everything up to hole_regions[curr_change_index] has been drawn properly
                                    - thus each iteration must fully draw [ho
                                it draws all the regions from hole_regions[j] up to and including the last complete one before end_frac
                            */

                            // index of the region up to which we have already drawn
                            // check to make sure we haven't reached end, and if not whether the
                            // whole hole/solid region is in this line part
                            while j + 1 < hole_regions.len() && hole_regions[j + 1] < end_frac {
                                info!(
                                    "\tDrew all of [{}, {}), hole? {}, j {}",
                                    hole_regions[j],
                                    hole_regions[j + 1],
                                    j & 1 != 0,
                                    j
                                );
                                // so this full hole/space is in this line part
                                draw(hole_regions[j], hole_regions[j + 1], j & 1 != 0, &mut tris);
                                j += 1;
                            }

                            // now draw from hole_regions[curr_change_index] to end_frac (if
                            // they're not the same)

                            // the next endcap will be dealt with by the next line/ the very end
                            // of the layer
                            if end_frac - hole_regions[j] > 1e-7 {
                                info!(
                                    "\tDrew final {}->{}, hole? {}, j {}",
                                    hole_regions[j],
                                    end_frac,
                                    j & 1 == 1,
                                    j
                                );
                                draw(hole_regions[j], end_frac, j & 1 == 1, &mut tris);
                            }
                        }
                    }
                }
                length_along_prev += prev_orig_lines[i].length;
                // increment after each part of the current 'new' line is considered
                current_position += new_orig_part.length;
            }
        }

        layer_steps = (layer_steps as f64 * step_scale).round() as i64;
    }
    return tris;
}

pub fn thicken_layers(layers: Vec<Segment>, thickness: f64) -> Vec<ThickSegment> {
    let mut segments: Vec<ThickSegment> = vec![];

    for layer in layers {
        segments.push(ThickSegment::thicken(layer, thickness));
    }
    return segments;
}

fn draw_layer_face(seg: &ThickSegment) -> Vec<Tri3d> {
    let mut tris = vec![];

    for i in 0..seg.inner_lines.len() {
        tris.extend_from_slice(&join_planar_lines(seg.inner_lines[i], seg.outer_lines[i]));
    }
    return tris;
}


fn draw_endcaps(curr_layer: &ThickSegment, prev_layer: &ThickSegment, tris: &mut Vec<Tri3d>, steps: i64) {
    // draw sides at start
    tris.extend(join_non_parallel(
        Line3d::new(curr_layer.inner_lines[0].start, curr_layer.outer_lines[0].start),
        Line3d::new(prev_layer.inner_lines[0].start, prev_layer.outer_lines[0].start),
        steps,
        None,
        None,
    ));
    // draw sides at end
    tris.extend(join_non_parallel(
        Line3d::new(
            curr_layer.inner_lines.last().unwrap().end,
            curr_layer.outer_lines.last().unwrap().end,
        ),
        Line3d::new(
            prev_layer.inner_lines.last().unwrap().end,
            prev_layer.outer_lines.last().unwrap().end,
        ),
        steps,
        None,
        None,
    ));
}
