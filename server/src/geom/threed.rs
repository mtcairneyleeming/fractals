use serde::{Deserialize, Serialize};

use super::twod::*;
use std::f64::EPSILON;
use std::fmt;
pub const EPS: f64 = EPSILON * 10.0;

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
    a: Point3d,
    b: Point3d,
    c: Point3d,
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

