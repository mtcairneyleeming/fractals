use serde::{Deserialize, Serialize};

use super::twod::*;
use std::f64::EPSILON;
use std::fmt;
pub const EPS: f64 = EPSILON * 10.0;
use super::offset::*;

#[derive(Copy, Clone, Debug, Deserialize, Serialize, PartialEq)]
pub struct Point3d {
    pub x: f64,
    pub y: f64,
    pub z: f64,
}

impl Point3d {
    pub fn new(x: f64, y: f64, z: f64) -> Point3d {
        Point3d { x, y, z }
    }

    pub(crate) fn from2d(start: Point2d, z: f64) -> Point3d {
        return Point3d::new(start.x, start.y, z);
    }

    pub(crate) fn to2d(&self) -> Point2d {
        return Point2d::new(self.x, self.y);
    }

    pub fn sub(&self, b: Point3d) -> Point3d {
        return Point3d::new(self.x - b.x, self.y - b.y, self.z - b.z);
    }

    pub fn add(&self, b: Point3d) -> Point3d {
        return Point3d::new(self.x + b.x, self.y + b.y, self.z + b.z);
    }

    pub fn cross(&self, b: Point3d) -> Point3d {
        let a = self;
        return Point3d::new(
            a.y * b.z - a.z * b.y,
            a.z * b.x - a.x * b.z,
            a.x * b.y - a.y * b.z,
        );
    }

    pub fn dot(&self, b: Point3d) -> f64 {
        let a = self;
        return a.x * b.x + a.y * b.y + a.z * b.z;
    }

    pub fn norm(&self) -> f64 {
        return (self.dot(*self)).sqrt();
    }

    pub fn scale(&self, s: f64) -> Point3d {
        return Point3d::new(self.x * s, self.y * s, self.z * s);
    }

    // assumes use as a vector not a position
    pub fn unit(&self) -> Point3d {
        return self.scale(1.0 / self.norm());
    }
}

impl fmt::Display for Point3d {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        write!(f, "({:.6}, {:.6}, {:.6})", self.x, self.y, self.z)
    }
}

#[derive(Clone, Copy, Deserialize)]
pub struct Line3d {
    pub start: Point3d,
    pub end: Point3d,
    pub length: f64,
}

impl Line3d {
    pub fn new(s: Point3d, e: Point3d) -> Line3d {
        let dx = s.x - e.x;
        let dy = s.y - e.y;
        let dz = s.z - e.z;
        return Line3d {
            start: s,
            end: e,
            length: (dx * dx + dy * dy + dz * dz).sqrt(),
        };
    }

    #[allow(dead_code)]
    pub(crate) fn from2d(x: Line2d, z: f64) -> Line3d {
        return Line3d::new(Point3d::from2d(x.start, z), Point3d::from2d(x.end, z));
    }

    pub(crate) fn to2d(&self) -> Line2d {
        return Line2d::new(self.start.to2d(), self.end.to2d());
    }

    pub fn point(&self, pos: f64) -> Point3d {
        if pos < EPS {
            self.start
        } else if pos > 1.0 - EPS {
            self.end
        } else {
            Point3d::new(
                self.start.x + pos * (self.end.x - self.start.x),
                self.start.y + pos * (self.end.y - self.start.y),
                self.start.z + pos * (self.end.z - self.start.z),
            )
        }
    }

    pub fn get_section(&self, start_frac: f64, end_frac: f64) -> Line3d {
        return Line3d::new(self.point(start_frac), self.point(end_frac));
    }

    pub fn direction(&self) -> Point3d {
        return self.end.sub(self.start).unit();
    }
}

impl fmt::Display for Line3d {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        write!(f, "{}->{}", self.start, self.end)
    }
}
impl fmt::Debug for Line3d {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        write!(f, "{}->{}", self.start, self.end)
    }
}

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
        return Tri3d::new(side.start, side.end, *point);
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
    pub(crate) fn from_parallel_lines(a: Line3d, b: Line3d) -> Self {
        let plane = Plane3d::from_two_lines(a, Line3d::new(a.start, b.start));
        // since our vectors are parallel they can either point exactly the same
        // direction or exactly opposite.
        let a_vect = a.end.sub(a.start);
        let b_vect = b.end.sub(b.start);

        let new_b = if a_vect.add(b_vect).norm() > a_vect.norm() {
            Line3d::new(b.end, b.start)
        } else {
            b
        };
        // now this is a trapezium cycle of vectors x.start -> x.end
        let edges = [
            plane.project_line(a),
            plane.project_line(Line3d::new(a.end, new_b.start)),
            plane.project_line(new_b),
            plane.project_line(Line3d::new(new_b.end, a.start)),
        ];
        return Trapezium3d { edges, plane };
    }

    pub(crate) fn offset(&self, offset: f64) -> Trapezium3d {
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
            origin: x1_l.start,
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
        Line2d::new(self.project_point(line.start), self.project_point(line.end))
    }

    pub(crate) fn unproject_point(&self, point: Point2d) -> Point3d {
        self.origin.add(self.x.scale(point.x)).add(self.y.scale(point.y))
    }
    pub(crate) fn unproject_line(&self, line: Line2d) -> Line3d {
        Line3d::new(self.unproject_point(line.start), self.unproject_point(line.end))
    }
}
