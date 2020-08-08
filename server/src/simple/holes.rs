use super::util::*;
use crate::geom::*;


fn find_trapezium_hole(a: Line3d, b: Line3d, frame_factor: f64) -> (Trapezium3d, Trapezium3d) {
    let trap = Trapezium3d::from_parallel_lines(a, b);

    let shortest_side_length = trap
        .edges
        .iter()
        .map(|line| line.length)
        .fold(f64::INFINITY, f64::min);
    // note minus signifies inwards - we leave the problem of inwards vs outwards to
    // offset_polygon
    let hole_trap = trap.offset(-frame_factor * shortest_side_length);
    (trap, hole_trap)
}

/// Join two parallel lines with a polygon with a hole cut out of it
pub(super) fn join_with_hole(a: Line3d, b: Line3d, frame_factor: f64) -> Vec<Tri3d> {
    let (trap, hole_trap) = find_trapezium_hole(a, b, frame_factor);
    let mut tris = vec![];
    for i in 0..4 {
        tris.extend_from_slice(
            &(draw_join_tris(
                trap.plane.unproject_line(trap.edges[i]),
                trap.plane.unproject_line(hole_trap.edges[i]),
            )),
        );
    }
    tris
}

pub(super) fn build_thick_hole(
    new_inner: Line3d,
    new_outer: Line3d,
    prev_inner: Line3d,
    prev_outer: Line3d,
    frame_factor: f64,
) -> Vec<Tri3d> {
    let tris = vec![];
    // note each pair are on the same plane
    let (inner_trap, inner_hole) = find_trapezium_hole(prev_inner, new_inner, frame_factor);
    let (outer_trap, outer_hole) = find_trapezium_hole(prev_outer, new_outer, frame_factor);
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
    tris
}
