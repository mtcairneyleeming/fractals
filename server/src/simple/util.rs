use crate::geom::*;
use itertools::Itertools;
use std::f64::consts;

pub(super) fn are_parallel(a: Line3d, b: Line3d) -> bool {
    // note that both are on planes of the form z = ?, so we can simplify to the 2d
    // case
    are_parallel2(a.to2d(), b.to2d())
}

pub(super) fn are_parallel2(a: Line2d, b: Line2d) -> bool {
    let ua = a.direction().unit();
    let ub = b.direction().unit();
    let slope_a = ua.y / ua.x;
    let slope_b = ub.y / ub.x;
    let angle_a = slope_a.atan();
    let angle_b = slope_b.atan();
    let mut abs = (angle_a - angle_b).abs();
    if abs > consts::FRAC_PI_2 {
        abs = consts::PI - abs
    }
    return abs < 1e-8;
}

/**
 * Creates a surface between two lines by drawing 2 triangles, one with a &
 * b.start, the other with b & a.end.
 * Note self will duplicate lines when used on adjacent bits of a developing
 * fractal, but that way it's simpler @param a one of two lines to join
 * @param b second of two lines to join
 */


pub(super) fn join_planar_lines(a: Line3d, b: Line3d) -> [Tri3d; 2] {
    return [Tri3d::from_sp(&a, &b.start), Tri3d::from_sp(&b, &a.end)];
}

pub(super) fn draw_many_joins(a: Line3d, b: Line3d, steps: i64) -> Vec<Tri3d> {
    join_non_parallel(a, b, steps, None, None)
}

pub(super) fn join_non_parallel(
    a: Line3d,
    b: Line3d,
    steps: i64,
    skip_from: Option<i64>,
    skip_until: Option<i64>,
) -> Vec<Tri3d> {
    //println!("Drawing with {} steps", steps);
    let mut tris = Vec::new();
    let starts = Line3d::new(a.start, b.start);
    let ends = Line3d::new(a.end, b.end);

    let skipping = if skip_from.is_some() || skip_until.is_some() {
        if skip_from.is_none() || skip_until.is_none() {
            panic!("Must provide all details for skipping")
        }
        let f = skip_from.unwrap();
        let u = skip_until.unwrap();
        if f < 1 || u > steps - 1 || u <= f {
            panic!("Step ranges malformed")
        }
        true
    } else {
        false
    };
    let mut prev = a;
    for i in 1..=steps {
        let adj_start = starts.point(i as f64 / steps as f64);
        let adj_end = ends.point(i as f64 / steps as f64);
        let new_line = Line3d::new(adj_start, adj_end);
        if !skipping || (i <= skip_from.unwrap() || i > skip_until.unwrap()) {
            tris.extend_from_slice(&join_planar_lines(prev, new_line));
        }
        prev = new_line;
    }
    tris
}


pub(super) fn fix_tris(tris: Vec<Tri3d>) -> (Vec<Tri3d>, bool) {
    let mut new_tris = Vec::new();
    let mut changed = false;

    for tri in tris {
        let sides = tri.sides();
        let lengths = sides.iter().map(|s| s.length).collect_vec();
        let max_side = lengths.iter().fold(f64::INFINITY, |a, &b| a.max(b));
        let min_side = lengths.iter().fold(f64::INFINITY, |a, &b| a.max(b));
        if max_side > 1.5 * min_side {
            // TODO: another mystery constant!
            changed = true;
            let mid = tri.centroid();
            new_tris.extend(sides.iter().map(|s| Tri3d::new(s.start, s.end, mid)))
        } else {
            new_tris.push(tri)
        }
    }
    return (new_tris, changed);
}

pub fn fix_tris_n(tris: Vec<Tri3d>, n: i32) -> Vec<Tri3d> {
    let (mut tris, mut changed) = fix_tris(tris);
    let mut j = 1;
    while changed && j < n {
        println!("Iteration {}", j);
        let (t, c) = fix_tris(tris);
        tris = t;
        changed = c;
        j += 1;
    }
    return tris;
}
