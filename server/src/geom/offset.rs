//! Various functions to offset an entire line/one of its endpoints depending on whether there is a preceding line that we should be aligning to.
//! All of these methods make certain implicit/explicit assumptions:
//!     - although they return `Point3d`, all lines passed to a function are assumed to be on a plane z=?, and all offsetting occurs in 2d on that plane
//!     - lines intersect: if two (or more) lines are passed in that are supposed to intersect, they really have to.

use super::threed::*;
use super::twod::*;

fn check_line(line: Line3d) {
    if line.start.z != line.end.z {
        panic!("Line {} was not on a z= plane.", line)
    }
}
fn check_lines(a: Line3d, b: Line3d) {
    check_line(a);
    check_line(b);
    if a.end != b.start {
        panic!("Lines {} and {} do not touch at endpoints.", a, b);
    }
}

/// Calculates the ccw 2d vector that bisects the angle at the intersection of `a` and `b`.alloc
///
/// The 'ccw' angle bisector is the vector that bisects the angle and is on the left of `a`.
/// If the two lines are (almost) parallel then a vector perpendicular to `a` (ensuring it is ccw) is returned.
/// Implicitly assumes points above.
fn angle_bisector(a: Line3d, b: Line3d) -> Result<Point2d, String> {
    // 2d versions of these two lines
    let a2 = a.to2d();
    let b2 = b.to2d();
    // direction vectors of each
    let va = a2.start.sub(a2.end);
    let vb = b2.end.sub(b2.start);
    // normed direction vectors
    let norm_a = va.scale_orig(va.norm());
    let norm_b = vb.scale_orig(vb.norm());

    let angle_diff =
        (norm_a.x * norm_b.y - norm_a.y * norm_b.x).atan2(norm_a.x * norm_b.x + norm_a.y * norm_b.y);

    let sum = norm_a.add(norm_b);
    let vect = if angle_diff > EPS {
        sum.unit()
    } else if angle_diff < -EPS {
        sum.scale_orig(-1.0).unit()
    } else {
        // roughly equals, so parallel
        Point2d::new(-norm_a.y, norm_a.x)
    };
    return Ok(vect);
}


fn offset_start_point(prev: Option<Line3d>, line: Line3d, offset: f64) -> Point3d {
    match prev {
        Some(prev_line) => offset_intersection(prev_line, line, offset),
        None => offset_line_endpoint(line, offset, true),
    }
}

fn offset_end_point(line: Line3d, next: Option<Line3d>, offset: f64) -> Point3d {
    match next {
        Some(next_line) => offset_intersection(line, next_line, offset),
        None => offset_line_endpoint(line, offset, false),
    }
}

/// Offsets the point at the intersection of prev, next by `offset`.
pub(super) fn offset_intersection(prev: Line3d, next: Line3d, offset: f64) -> Point3d {
    check_lines(prev, next);

    let bisector = angle_bisector(prev, next);
    if let Err(msg) = bisector {
        panic!(msg)
    }
    // could equally be prev.end
    Point3d::from2d(
        next.start.to2d().add(bisector.unwrap().scale_orig(offset)),
        prev.end.z,
    )
}

/// Offsets an endpoint (which one is controlled by `start`) of the provided line by `offset`.
/// Note offset is multiplied by -1 to ensure consistency with the other offsetting methods.
pub(super) fn offset_line_endpoint(line: Line3d, offset: f64, start: bool) -> Point3d {
    check_line(line);
    let dir = line.end.sub(line.start);
    let norm = dir.scale(1.0 / dir.norm());
    let ccw = Point2d::new(-norm.y, norm.x);
    Point3d::from2d(
        if start { line.start } else { line.end }
            .to2d()
            .add(ccw.scale_orig(-offset)),
        line.start.z,
    )
}

/// Given a line, and possibly two lines that join it, offset the line by offset.
pub(super) fn offset_line(line: Line3d, prev: Option<Line3d>, next: Option<Line3d>, offset: f64) -> Line3d {
    if prev.is_some() {
        check_lines(prev.unwrap(), line)
    }
    if next.is_some() {
        check_lines(line, next.unwrap())
    }

    let new_start = offset_start_point(prev, line, offset);
    let new_end = offset_end_point(line, next, offset);

    return Line3d::new(new_start, new_end);
}
