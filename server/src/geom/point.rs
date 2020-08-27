use serde::{Deserialize, Serialize};

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


#[derive(Copy, Clone, Debug)]
pub struct Point2d {
    pub x: f64,
    pub y: f64,
}

impl Point2d {
    pub fn new(x: f64, y: f64) -> Point2d {
        Point2d { x, y }
    }

    pub(crate) fn scale(&self, xy_scale: f64) -> Point2d {
        Point2d::new(xy_scale * self.x, xy_scale * self.y)
    }

    pub(crate) fn sub(&self, b: Point2d) -> Point2d {
        return Point2d::new(self.x - b.x, self.y - b.y);
    }

    pub(crate) fn add(&self, b: Point2d) -> Point2d {
        return Point2d::new(self.x + b.x, self.y + b.y);
    }

    pub(crate) fn dot(&self, b: Point2d) -> f64 {
        let a = self;
        return a.x * b.x + a.y * b.y;
    }

    pub(crate) fn norm(&self) -> f64 {
        return (self.dot(*self)).sqrt();
    }
    // assumes use as a vector not a position
    pub(crate) fn unit(&self) -> Point2d {
        return self.scale(1.0 / self.norm());
    }
}
impl fmt::Display for Point2d {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        write!(f, "({:.6}, {:.6})", self.x, self.y)
    }
}
