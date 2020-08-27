use super::line::*;
use super::offset::{offset_intersection2, offset_line2};
use super::point::*;
use super::twod::*;
use serde::Serialize;

#[derive(Clone, Debug, Serialize)]
pub struct Tri3d {
    pub a: Point3d,
    pub b: Point3d,
    pub c: Point3d,
}

impl Tri3d {
    pub fn new(a: Point3d, b: Point3d, c: Point3d) -> Self {
        Tri3d { a, b, c }
    }

    pub fn sides(&self) -> Vec<Line3d> {
        return vec![
            Line3d::new(self.a, self.b),
            Line3d::new(self.a, self.c),
            Line3d::new(self.b, self.c),
        ];
    }

    pub fn centroid(&self) -> Point3d {
        return self.a.add(self.b).add(self.c).scale(1.0 / 3.0);
    }

    pub fn from_sp(side: &Line3d, point: &Point3d) -> Tri3d {
        return Tri3d::new(side.start(), side.end(), *point);
    }
}

#[derive(Copy, Clone, Debug)]
pub(crate) struct Trapezium3d {
    /// A list of edges where consecutive edges touch at ends, the loop is
    /// complete and never self-intersects.
    pub edges: [Line2d; 4],
    pub plane: Plane3d,
}

impl Trapezium3d {
    pub(crate) fn hole(&self, frame_factor: f64) -> Trapezium3d {
        let shortest_side_length = self
            .edges
            .iter()
            .map(|line| line.length)
            .fold(f64::INFINITY, f64::min);
        // note minus signifies inwards - we leave the problem of inwards vs outwards to
        // offset_polygon
        let hole_trap = self.offset(-frame_factor * shortest_side_length);
        hole_trap
    }

    pub(crate) fn from_parallel_lines(a: Line3d, b: Line3d) -> Self {
        let plane = Plane3d::from_two_lines(a, Line3d::new(a.start(), b.start()));
        // since our vectors are parallel they can either point exactly the same
        // direction or exactly opposite.
        let a_vect = a.end().sub(a.start());
        let b_vect = b.end().sub(b.start());

        let new_b = if a_vect.add(b_vect).norm() > a_vect.norm() {
            Line3d::new(b.end(), b.start())
        } else {
            b
        };
        // now this is a trapezium cycle of vectors x.start() -> x.end()
        let edges = [
            plane.project_line(a),
            plane.project_line(Line3d::new(a.end(), new_b.start())),
            plane.project_line(new_b),
            plane.project_line(Line3d::new(new_b.end(), a.start())),
        ];
        return Trapezium3d { edges, plane };
    }

    fn offset(&self, offset: f64) -> Trapezium3d {
        // to test which way the loop goes, we take a point and offset it, and then
        // check if the point is in it.
        let test_point = offset_intersection2(self.edges[0], self.edges[1], offset);
        let tri = Tri2d::from_sp(self.edges[0], self.edges[1].end);
        let new_offset = if tri.contains_point(test_point) { -1.0 } else { 1.0 } * offset;

        let trap = Trapezium3d {
            plane: self.plane,
            edges: [
                offset_line2(
                    self.edges[0],
                    Some(self.edges[3]),
                    Some(self.edges[1]),
                    new_offset,
                ),
                offset_line2(
                    self.edges[1],
                    Some(self.edges[0]),
                    Some(self.edges[2]),
                    new_offset,
                ),
                offset_line2(
                    self.edges[2],
                    Some(self.edges[1]),
                    Some(self.edges[3]),
                    new_offset,
                ),
                offset_line2(
                    self.edges[3],
                    Some(self.edges[2]),
                    Some(self.edges[0]),
                    new_offset,
                ),
            ],
        };
        trap
    }
}

#[derive(Copy, Clone, Debug)]
pub struct Plane3d {
    origin: Point3d,
    x: Point3d,
    y: Point3d,
}

impl Plane3d {
    /// given two lines (non parallel), construct the plane they both lie on.
    /// the start of `a` is set to be the origin.
    pub(crate) fn from_two_lines(x1_l: Line3d, x2_l: Line3d) -> Self {
        let x1 = x1_l.direction();
        let x2 = x2_l.direction();
        let w1 = x1.unit();
        let v2 = x2.sub(w1.scale(x2.dot(w1)));
        let w2 = v2.unit();
        return Plane3d {
            origin: x1_l.start(),
            x: w1,
            y: w2,
        };
    }
    /// requires point to be on plane
    pub(crate) fn project_point(&self, point: Point3d) -> Point2d {
        let diff = point.sub(self.origin);
        return if diff.norm() < EPS {
            Point2d::new(0.0, 0.0)
        } else if diff.unit().sub(self.x).norm() < EPS {
            Point2d::new(diff.norm(), 0.0)
        } else if diff.unit().sub(self.y).norm() < EPS {
            Point2d::new(0.0, diff.norm())
        } else {
            let len = diff.norm();
            let cos_angle = diff.dot(self.x) / len;
            let alpha = len * cos_angle;
            let beta = (len * len - alpha * alpha).sqrt();
            Point2d::new(alpha, beta)
        };
    }
    pub(crate) fn project_line(&self, line: Line3d) -> Line2d {
        Line2d::new(self.project_point(line.start()), self.project_point(line.end()))
    }

    pub(crate) fn unproject_point(&self, point: Point2d) -> Point3d {
        self.origin.add(self.x.scale(point.x)).add(self.y.scale(point.y))
    }
    pub(crate) fn unproject_line(&self, line: Line2d) -> Line3d {
        Line3d::new(self.unproject_point(line.start), self.unproject_point(line.end))
    }
}
