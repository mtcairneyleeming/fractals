use super::holes::*;
use super::util::*;
use crate::geom::*;
use itertools::Itertools;

pub(crate) fn simple_thick(segments: Vec<Vec<ThickSegment>>, hole_options: HoleOptions) -> Vec<Tri3d> {
    if segments.len() == 0 {
        panic!("")
    }

    // output
    let mut tris: Vec<Tri3d> = Vec::new();
    tris.extend(draw_layer_face(&segments[0]));

    tris.extend(draw_layer_face(&segments[segments.len() - 1]));

    let mut hole_scale = 1.0; //only useful if using HoleOptions::Everywhere

    for layer in 1..segments.len() {
        let prev_segments = &segments[(layer - 1) as usize];
        let curr_segments = &segments[layer as usize];

        if prev_segments.len() == 0 || curr_segments.len() == 0 {
            panic!("No segments to draw!!!!!!")
        }
        // draw sides at start
        tris.extend_from_slice(&draw_join_tris(
            Line3d::new(curr_segments[0].inner_start, curr_segments[0].outer_start),
            Line3d::new(prev_segments[0].inner_start, prev_segments[0].outer_start),
        ));
        // draw sides at end
        tris.extend_from_slice(&draw_join_tris(
            Line3d::new(
                curr_segments.last().unwrap().inner_end(),
                curr_segments.last().unwrap().outer_end(),
            ),
            Line3d::new(
                prev_segments.last().unwrap().inner_end(),
                prev_segments.last().unwrap().outer_end(),
            ),
        ));

        // update hole_scale (only for HoleOptions::Everywhere)
        let hole_regions = if let HoleOptions::Everywhere {
            hole_frac,
            spacing_frac,
            scaling_factor,
            vertical_side_thickness: _,
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
            println!("Regions: {:?}", regions);
            hole_scale *= scaling_factor;
            regions
        } else {
            vec![]
        };
        let mut current_position = 0.0;
        let layer_length: f64 = curr_segments.iter().map(|seg| seg.original.length()).sum();
        for (key, group) in &curr_segments.into_iter().group_by(|seg| seg.original.prev_index) {
            let prev_segment = &prev_segments[key];
            let group_segments: Vec<&ThickSegment> = group.collect();
            let mut group_length = 0.0;

            for segment in &group_segments {
                group_length += segment.original.length()
            }
            let group_start = current_position;

            for new_segment in &group_segments {
                // there is one offset line on each side for every original line
                for i in 0..new_segment.original.lines.len() {
                    let orig_line = new_segment.original.lines[i];
                    let inner_line = new_segment.inner_lines[i];
                    let outer_line = new_segment.outer_lines[i];
                    // find section of segment on prev level to join to self line

                    /* note the section may be multiple lines as there are no enforced
                       rules that say the previous iteration should be less complicated
                       than this one (even though this will be true for any sensible
                       fractal)
                    */
                    let start_frac = (current_position - group_start) / group_length;
                    let end_frac = (current_position + orig_line.length - group_start) / group_length;

                    let (prev_orig_lines, prev_inner_lines, prev_outer_lines) =
                        prev_segment.get_section(start_frac, end_frac);

                    let total_prev_length = prev_orig_lines.iter().fold(0.0, |s, l| s + l.length);
                    let mut length_along_prev_orig = 0.0;
                    for i in 0..prev_orig_lines.len() {
                        // fractions into orig_line
                        let new_start_frac = length_along_prev_orig / total_prev_length;
                        let new_end_frac =
                            (length_along_prev_orig + prev_orig_lines[i].length) / total_prev_length;

                        let new_inner_part = inner_line.get_section(new_start_frac, new_end_frac);
                        let new_outer_part = outer_line.get_section(new_start_frac, new_end_frac);
                        let new_orig_part = orig_line.get_section(new_start_frac, new_end_frac);

                        match hole_options {
                            HoleOptions::None => {
                                tris.extend(draw_many_joins(prev_inner_lines[i], new_inner_part));
                                tris.extend(draw_many_joins(prev_outer_lines[i], new_outer_part));
                            }
                            HoleOptions::ParallelOnly { frame_factor } => {
                                if are_parallel(prev_inner_lines[i], new_inner_part)
                                    && are_parallel(prev_outer_lines[i], new_inner_part)
                                    && prev_orig_lines[i].length > 0.1 * prev_segment.original.length()
                                    && new_orig_part.length > 0.1 * new_segment.original.length()
                                {
                                    build_thick_hole(
                                        new_inner_part,
                                        new_outer_part,
                                        prev_inner_lines[i],
                                        prev_outer_lines[i],
                                        frame_factor,
                                    );
                                } else {
                                    tris.extend(draw_many_joins(prev_inner_lines[i], new_inner_part));
                                    tris.extend(draw_many_joins(prev_outer_lines[i], new_outer_part));
                                }
                            }
                            HoleOptions::Everywhere {
                                hole_frac: _,
                                spacing_frac: _,
                                scaling_factor: _,
                                vertical_side_thickness,
                            } => {
                                // Note certain assumptions about hole_regions:
                                //      - the first entry is 0.0, the last entry 1.0
                                //      - thus the second entry is the end of the first solid section, and so
                                //        on
                                //      - so an index like j below being odd means the section preceding it is
                                //        solid
                                let start_frac = current_position / layer_length;
                                let end_frac = (current_position + new_orig_part.length) / layer_length;

                                // #region endcap, solid, hole methods for drawing to tris
                                let layer_frac_to_part_frac =
                                    |layer_frac: f64| (layer_frac - start_frac) / (end_frac - start_frac);
                                let solid = |first: f64, second: f64, tris: &mut Vec<Tri3d>| {
                                    println!(
                                        "\tSolid, layer {} -> {}; part {} ->{}",
                                        first,
                                        second,
                                        layer_frac_to_part_frac(first),
                                        layer_frac_to_part_frac(second)
                                    );
                                    tris.extend(draw_many_joins(
                                        Line3d::new(
                                            prev_inner_lines[i].point(layer_frac_to_part_frac(first)),
                                            prev_inner_lines[i].point(layer_frac_to_part_frac(second)),
                                        ),
                                        Line3d::new(
                                            new_inner_part.point(layer_frac_to_part_frac(first)),
                                            new_inner_part.point(layer_frac_to_part_frac(second)),
                                        ),
                                    ));
                                    tris.extend(draw_many_joins(
                                        Line3d::new(
                                            prev_outer_lines[i].point(layer_frac_to_part_frac(first)),
                                            prev_outer_lines[i].point(layer_frac_to_part_frac(second)),
                                        ),
                                        Line3d::new(
                                            new_outer_part.point(layer_frac_to_part_frac(first)),
                                            new_outer_part.point(layer_frac_to_part_frac(second)),
                                        ),
                                    ));
                                };
                                let hole = |first: f64, second: f64, tris: &mut Vec<Tri3d>| {
                                    println!(
                                        "\tHole, layer {} -> {}; part {} ->{}",
                                        first,
                                        second,
                                        layer_frac_to_part_frac(first),
                                        layer_frac_to_part_frac(second)
                                    );
                                    let prev_inner_start =
                                        prev_inner_lines[i].point(layer_frac_to_part_frac(first));
                                    let prev_inner_end =
                                        prev_inner_lines[i].point(layer_frac_to_part_frac(second));

                                    let prev_outer_start =
                                        prev_outer_lines[i].point(layer_frac_to_part_frac(first));
                                    let prev_outer_end =
                                        prev_outer_lines[i].point(layer_frac_to_part_frac(second));

                                    let new_inner_start =
                                        new_inner_part.point(layer_frac_to_part_frac(first));
                                    let new_inner_end = new_inner_part.point(layer_frac_to_part_frac(second));

                                    let new_outer_start =
                                        new_outer_part.point(layer_frac_to_part_frac(first));
                                    let new_outer_end = new_outer_part.point(layer_frac_to_part_frac(second));

                                    let inner_start_line = Line3d::new(prev_inner_start, new_inner_start);
                                    let inner_end_line = Line3d::new(prev_inner_end, new_inner_end);
                                    let outer_start_line = Line3d::new(prev_outer_start, new_outer_start);

                                    let outer_end_line = Line3d::new(prev_outer_end, new_outer_end);
                                    // Top outer/inner parts
                                    tris.extend(draw_many_joins(
                                        Line3d::new(prev_inner_start, prev_inner_end),
                                        Line3d::new(
                                            inner_start_line.point(vertical_side_thickness),
                                            inner_end_line.point(vertical_side_thickness),
                                        ),
                                    ));
                                    tris.extend(draw_many_joins(
                                        Line3d::new(prev_outer_start, prev_outer_end),
                                        Line3d::new(
                                            outer_start_line.point(vertical_side_thickness),
                                            outer_end_line.point(vertical_side_thickness),
                                        ),
                                    ));
                                    // bottom outer/inner parts
                                    tris.extend(draw_many_joins(
                                        Line3d::new(new_inner_start, new_inner_end),
                                        Line3d::new(
                                            inner_start_line.point(1.0 - vertical_side_thickness),
                                            inner_end_line.point(1.0 - vertical_side_thickness),
                                        ),
                                    ));
                                    tris.extend(draw_many_joins(
                                        Line3d::new(new_outer_start, new_outer_end),
                                        Line3d::new(
                                            outer_start_line.point(1.0 - vertical_side_thickness),
                                            outer_end_line.point(1.0 - vertical_side_thickness),
                                        ),
                                    ));
                                    // joins to make solid
                                    tris.extend(draw_many_joins(
                                        Line3d::new(
                                            outer_start_line.point(vertical_side_thickness),
                                            outer_end_line.point(vertical_side_thickness),
                                        ),
                                        Line3d::new(
                                            inner_start_line.point(vertical_side_thickness),
                                            inner_end_line.point(vertical_side_thickness),
                                        ),
                                    ));
                                    tris.extend(draw_many_joins(
                                        Line3d::new(
                                            inner_start_line.point(1.0 - vertical_side_thickness),
                                            inner_end_line.point(1.0 - vertical_side_thickness),
                                        ),
                                        Line3d::new(
                                            outer_start_line.point(1.0 - vertical_side_thickness),
                                            outer_end_line.point(1.0 - vertical_side_thickness),
                                        ),
                                    ));
                                };
                                let endcap = |layer_frac: f64, tris: &mut Vec<Tri3d>| {
                                    println!("\tENDCAP AT {}", layer_frac);
                                    let f = layer_frac_to_part_frac(layer_frac);
                                    let prev_inner = prev_inner_lines[i].point(f);

                                    let prev_outer = prev_outer_lines[i].point(f);
                                    let new_inner = new_inner_part.point(f);
                                    let new_outer = new_outer_part.point(f);
                                    let outer = Line3d::new(prev_outer, new_outer);
                                    let inner = Line3d::new(prev_inner, new_inner);


                                    tris.extend_from_slice(&draw_join_tris(
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


                                let mut j = 1;
                                while start_frac >= hole_regions[j] {
                                    j += 1
                                }

                                // so start_frac is in [hole_regions[j-1], hole_regions[j])

                                if (start_frac - hole_regions[j]).abs() < 1e-7 {
                                    println!("Drawing first endcap");
                                    endcap(start_frac, &mut tris)
                                }

                                if end_frac < hole_regions[j] {
                                    // this line is fully within this hole/space region
                                    if j % 2 == 0 {
                                        println!("Drawing full hole");
                                        hole(start_frac, end_frac, &mut tris)
                                    } else {
                                        println!("Drawing full line");
                                        tris.extend(draw_many_joins(prev_inner_lines[i], new_inner_part));
                                        tris.extend(draw_many_joins(prev_outer_lines[i], new_outer_part));
                                    }
                                } else {
                                    // we've just added an endcap if necessary at start_frac
                                    if j % 2 == 0 {
                                        println!("Drawing first hole");
                                        hole(start_frac, hole_regions[j], &mut tris)
                                    } else {
                                        println!("Drawing first solid");
                                        solid(start_frac, hole_regions[j], &mut tris)
                                    }

                                    /* the loop below works as follows:
                                            - the invariant is that everything up to hole_regions[curr_change_index] has been drawn properly
                                            - thus each iteration must draw an endcap, and then draw/not the solid/hole up to the next change in hole status
                                        it draws all the regions from hole_regions[j] up to and including the last complete one before end_frac
                                    */

                                    // index of the region up to which we have already drawn
                                    let mut curr_region = j;
                                    // check to make sure we haven't reached end, and if not whether the
                                    // whole hole/solid region is in this line part
                                    while curr_region + 1 < hole_regions.len()
                                        && hole_regions[curr_region + 1] < end_frac
                                    {
                                        println!(
                                            "!!Check: {}, {} < {} < {} <= {} ??",
                                            start_frac < hole_regions[curr_region]
                                                && hole_regions[curr_region + 1] <= end_frac,
                                            start_frac,
                                            hole_regions[curr_region],
                                            hole_regions[curr_region + 1],
                                            end_frac
                                        );
                                        // so this full hole/space is in this line part
                                        println!("Drawing endcap for region {}", curr_region);
                                        endcap(hole_regions[curr_region], &mut tris);
                                        if curr_region % 2 == 0 {
                                            println!("Drawing hole for {}", curr_region);
                                            hole(
                                                hole_regions[curr_region],
                                                hole_regions[curr_region + 1],
                                                &mut tris,
                                            )
                                        } else {
                                            println!("Drawing solid for {}", curr_region);
                                            solid(
                                                hole_regions[curr_region],
                                                hole_regions[curr_region + 1],
                                                &mut tris,
                                            )
                                        }
                                        curr_region += 1;
                                    }

                                    // now draw from hole_regions[curr_change_index] to end_frac (if
                                    // they're not the same)

                                    // the next endcap will be dealt with by the next line/ the very end
                                    // of the layer
                                    if end_frac < 1.0 - 1e-8
                                        && (end_frac - hole_regions[curr_region]).abs() > 1e-7
                                    {
                                        if curr_region % 2 == 1 {
                                            println!("Drawing final hole");
                                            hole(hole_regions[curr_region], end_frac, &mut tris)
                                        } else {
                                            println!("Drawing final solid");
                                            solid(hole_regions[curr_region], end_frac, &mut tris)
                                        }
                                    }
                                }
                            }
                        }
                        length_along_prev_orig += prev_orig_lines[i].length;
                        // increment after each part of the current 'new' line is considered
                        current_position += new_orig_part.length;
                    }
                }
            }
        }
    }
    return tris;
}

pub fn thicken_segments(in_segments: Vec<Vec<Segment>>, thickness: f64) -> Vec<Vec<ThickSegment>> {
    let mut segments: Vec<Vec<ThickSegment>> = vec![];

    for segs in in_segments {
        let mut nsegs = vec![];
        if segs.len() == 0 {
            panic!("Help")
        }
        // initially prev_line is none, but next_line is set before the first thickening
        let mut prev_line: Option<Line3d> = None;
        let mut next_line: Option<Line3d> = None;
        for i in 0..segs.len() {
            if i != segs.len() - 1 {
                // find the next actual line, if we're not at the end of the segment.
                for j in (i + 1)..segs.len() {
                    if segs[j].lines.len() > 0 {
                        next_line = Some(segs[j].lines[0]);
                        break;
                    }
                }
            }
            nsegs.push(ThickSegment::thicken(
                segs[i].clone(),
                thickness,
                prev_line,
                next_line,
            ));

            // update the previous line if there is a line in this segment
            prev_line = segs[i].lines.last().cloned().or(prev_line);
            next_line = None;
        }
        segments.push(nsegs)
    }
    return segments;
}

fn draw_layer_face(segs: &Vec<ThickSegment>) -> Vec<Tri3d> {
    let mut tris = vec![];
    for seg in segs {
        for i in 0..seg.inner_lines.len() {
            tris.extend_from_slice(&draw_join_tris(seg.inner_lines[i], seg.outer_lines[i]));
        }
    }
    return tris;
}
