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
    if a.end.sub(b.start).norm() > 1e-7 {
        panic!("Lines {} and {} do not touch at endpoints.", a, b);
    }
}

fn smallest_angle_between(a: Point2d, b: Point2d) -> f64 {
    if a.sub(b).norm() < EPS {
        0.0
    } else {
        a.dot(b).acos()
    }
}

/// Calculates the ccw 2d vector that bisects the angle at the intersection of `a` and `b`.alloc
///
/// The 'ccw' angle bisector is the vector that bisects the angle and is on the left of `a`.
/// If the two lines are (almost) parallel then a vector perpendicular to `a` (ensuring it is ccw) is returned.
/// Implicitly assumes points above.
fn angle_bisector2(a: Line2d, b: Line2d) -> Result<(Point2d, f64), String> {
    // 2d versions of these two lines
    // direction vectors of each
    let va = a.start.sub(a.end);
    let vb = b.end.sub(b.start);
    // normed direction vectors
    let norm_a = va.unit();
    let norm_b = vb.unit();

    let sum = norm_a.add(norm_b).unit();
    // http://geomalgorithms.com/vector_products.html#2D-Perp-Product
    let perp_2d_prob = norm_a.x * norm_b.y - norm_a.y * norm_b.x;
    let vect = if perp_2d_prob > EPS {
        sum
    } else if perp_2d_prob < -EPS {
        sum.scale(-1.0)
    } else {
        // roughly equals, so parallel
        return Ok((Point2d::new(-norm_a.y, norm_a.x), std::f64::consts::FRAC_PI_2));
    };
    let angle_to_bis = smallest_angle_between(vect, norm_a);
    return Ok((vect, angle_to_bis));
}

fn offset_start_point2(prev: Option<Line2d>, line: Line2d, offset: f64) -> Point2d {
    match prev {
        Some(prev_line) => offset_intersection2(prev_line, line, offset),
        None => offset_line_endpoint2(line, offset, true),
    }
}

fn offset_end_point2(line: Line2d, next: Option<Line2d>, offset: f64) -> Point2d {
    match next {
        Some(next_line) => offset_intersection2(line, next_line, offset),
        None => offset_line_endpoint2(line, offset, false),
    }
}

/// Offsets the point at the intersection of prev, next by `offset`.
pub(super) fn offset_intersection2(prev: Line2d, next: Line2d, offset: f64) -> Point2d {
    match angle_bisector2(prev, next) {
        Err(msg) => panic!(msg),
        // could equally be prev.end
        Ok((vect, angle)) => next.start.add(vect.scale(offset / angle.sin())),
    }
}
pub(super) fn offset_intersection(prev: Line3d, next: Line3d, offset: f64) -> Point3d {
    check_lines(prev, next);

    Point3d::from2d(offset_intersection2(prev.to2d(), next.to2d(), offset), prev.end.z)
}

pub(super) fn offset_line_endpoint2(line: Line2d, offset: f64, start: bool) -> Point2d {
    let dir = line.end.sub(line.start);
    let norm = dir.scale(1.0 / dir.norm());
    let ccw = Point2d::new(-norm.y, norm.x);
    if start { line.start } else { line.end }.add(ccw.scale(-offset))
}
/// Offsets an endpoint (which one is controlled by `start`) of the provided line by `offset`.
/// Note offset is multiplied by -1 to ensure consistency with the other offsetting methods.
pub(super) fn offset_line_endpoint(line: Line3d, offset: f64, start: bool) -> Point3d {
    check_line(line);

    Point3d::from2d(offset_line_endpoint2(line.to2d(), offset, start), line.start.z)
}

/// Given a line, and possibly two lines that join it, offset the line by offset.
pub(super) fn offset_line2(line: Line2d, prev: Option<Line2d>, next: Option<Line2d>, offset: f64) -> Line2d {
    let new_start = offset_start_point2(prev, line, offset);
    let new_end = offset_end_point2(line, next, offset);

    return Line2d::new(new_start, new_end);
}

pub(crate) fn offset_line(line: Line3d, prev: Option<Line3d>, next: Option<Line3d>, offset: f64) -> Line3d {
    if prev.is_some() {
        check_lines(prev.unwrap(), line)
    }
    if next.is_some() {
        check_lines(line, next.unwrap())
    }
    let mut new = offset_line2(
        line.to2d(),
        prev.map(|x| x.to2d()),
        next.map(|x| x.to2d()),
        offset,
    );
    if new.direction().unit().add(line.to2d().direction().unit()).norm() < 1e-8 {
        new = Line2d::new(new.end, new.start)
    }
    Line3d::from2d(new, line.start.z)
}
