use crate::geom::*;
use super::util::*;
use itertools::Itertools;

pub fn simple_thick(in_segments: Vec<Vec<Segment>>, n: i32, draw_axiom: bool, thickness: f64) -> Vec<Tri3d> {
    // output
    let mut tris: Vec<Tri3d> = Vec::new();
    let segments = thicken_segments(in_segments, thickness);
    let start = if draw_axiom { 1 } else { 2 };

  
    tris.extend(draw_layer_face(&segments[  if draw_axiom {0} else {1}]));
    tris.extend(draw_layer_face(&segments[n as usize]));

    for layer in start..=n {
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

        for (key, group) in &curr_segments.into_iter().group_by(|seg| seg.original.prev_index) {
            let prev_segment = &prev_segments[key];
            let group_segments: Vec<&ThickSegment> = group.collect();
            let mut group_length = 0.0;

            for segment in &group_segments {
                group_length += segment.original.length()
            }

            let mut curr_start = 0.0;
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
                    let start_frac = curr_start / group_length;
                    let end_frac = (curr_start + orig_line.length) / group_length;

                    let (prev_orig_lines, prev_inner_lines, prev_outer_lines) =
                        prev_segment.get_section(start_frac, end_frac);

                    let total_prev_length = prev_orig_lines.iter().fold(0.0, |s, l| s + l.length);
                    let mut length_along_prev_orig = 0.0;
                    for i in 0..prev_orig_lines.len() {
                        let new_start_frac = length_along_prev_orig / total_prev_length;
                        let new_end_frac =
                            (length_along_prev_orig + prev_orig_lines[i].length) / total_prev_length;

                        let new_inner_part = inner_line.get_section(new_start_frac, new_end_frac);
                        let new_outer_part = outer_line.get_section(new_start_frac, new_end_frac);
                        if are_parallel(prev_inner_lines[i], new_inner_part)
                            && are_parallel(prev_outer_lines[i], new_inner_part)
                        {
                            // note each pair are on the same plane
                            let (inner_trap, inner_hole) =
                                find_trapezium_hole(prev_inner_lines[i], new_inner_part);
                            let (outer_trap, outer_hole) =
                                find_trapezium_hole(prev_outer_lines[i], new_outer_part);
                            for i in 0..4 {
                                // inner tris
                                tris.extend_from_slice(
                                    &(draw_join_tris(
                                        inner_trap.plane.unproject_line(inner_trap.edges[i]),
                                        inner_hole.plane.unproject_line(inner_hole.edges[i]),
                                    )),
                                );
                                // outer tris
                                tris.extend_from_slice(
                                    &(draw_join_tris(
                                        outer_trap.plane.unproject_line(outer_trap.edges[i]),
                                        outer_hole.plane.unproject_line(outer_hole.edges[i]),
                                    )),
                                );
                                // link outer & inner
                                tris.extend_from_slice(
                                    &(draw_join_tris(
                                        outer_hole.plane.unproject_line(outer_hole.edges[i]),
                                        inner_hole.plane.unproject_line(inner_hole.edges[i]),
                                    )),
                                );
                            }
                        } else {
                            tris.extend(draw_many_joins(prev_inner_lines[i], new_inner_part));
                            tris.extend(draw_many_joins(prev_outer_lines[i], new_outer_part));
                        }
                        length_along_prev_orig += prev_orig_lines[i].length;
                    }

                    curr_start += orig_line.length;
                }
            }
        }
    }
    return tris;
}


fn thicken_segments(in_segments: Vec<Vec<Segment>>, thickness: f64) -> Vec<Vec<ThickSegment>> {
    let mut segments: Vec<Vec<ThickSegment>> = vec![];

    for segs in in_segments {
        let mut nsegs = vec![];
        if segs.len() == 0 {
            panic!("Help")
        } else if segs.len() == 1 {
            nsegs.push(ThickSegment::thicken(segs[0].clone(), thickness, None, None))
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



fn draw_layer_face(segs: &Vec<ThickSegment>) -> Vec<Tri3d>{
    let mut tris = vec![];
    for seg in segs {
        for i in 0..seg.inner_lines.len() {
            tris.extend_from_slice(&draw_join_tris(seg.inner_lines[i], seg.outer_lines[i]));
        }
    }
    return tris;
}
