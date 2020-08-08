use super::util::*;
use super::holes::*;
use crate::geom::*;
use itertools::Itertools;

pub fn simple_thin(segments: Vec<Vec<Segment>>, add_holes: bool, frame_factor: Option<f64>) -> Vec<Tri3d> {
    let mut tris: Vec<Tri3d> = Vec::new();

    for i in 1..segments.len() {
        let prev_segments = &segments[(i - 1) as usize];
        let curr_segments = &segments[i as usize];

        for (key, group) in &curr_segments.into_iter().group_by(|seg| seg.prev_index) {
            let prev_segment = prev_segments[key].clone();
            let group_segments: Vec<&Segment> = group.collect();
            let mut group_length = 0.0;

            for segment in &group_segments {
                group_length += segment.length()
            }

            let mut seg_start = 0.0;
            for new_segment in &group_segments {
                if new_segment.length() > 0.0 {
                    //throw new Error(n.toString())
                    let mut s = seg_start;
                    // add tris, lines for each of the new lines
                    for line in &(new_segment.lines) {
                        // find section of segment on prev level to join to self line

                        /* note the section may be multiple lines as there are no enforced
                           rules that say the previous iteration should be less complicated
                           than self one (even though self will be true for any sensible
                           fractal)
                        */
                        let start_frac = s / group_length;
                        let end_frac = (s + line.length) / group_length;
                        let prev_lines = prev_segment.get_section(start_frac, end_frac);

                        let total_prev_length = prev_lines.iter().fold(0.0, |s, l| s + l.length);
                        let mut new_s = 0.0;
                        for prev_line in prev_lines {
                            let new_start_frac = new_s / total_prev_length;
                            let new_end_frac = (new_s + prev_line.length) / total_prev_length;

                            let new_part = line.get_section(new_start_frac, new_end_frac);

                            if add_holes
                                && are_parallel(prev_line, new_part)
                                && prev_line.length > 0.1 * prev_segment.length()
                                && new_part.length > 0.1 * new_segment.length()
                            {
                                tris.extend(join_with_hole(prev_line, new_part, frame_factor.unwrap()));
                            } else {
                                tris.extend(draw_many_joins(prev_line, new_part));
                            }
                            new_s += prev_line.length;
                        }

                        s = s + line.length;
                    }
                    seg_start = s;
                }
            }
        }
    }
    let (mut tris, mut changed) = fix_tris(tris);
    let mut j = 1;
    while changed && j < 5 {
        let (t, c) = fix_tris(tris);
        tris = t;
        changed = c;
        j += 1;
    }
    return tris;
}
