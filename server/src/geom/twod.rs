use std::fmt;

pub(crate) struct Line2d {
    pub start: Point2d,
    pub end: Point2d,
}
impl Line2d {
    pub fn new(start: Point2d, end: Point2d) -> Self {
        Line2d { start, end }
    }
}

impl fmt::Display for Line2d {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        write!(f, "{},{}", self.start, self.end)
    }
}

#[derive(Copy, Clone)]
pub(crate) struct Point2d {
    pub x: f64,
    pub y: f64,
}

impl Point2d {
    pub fn new(x: f64, y: f64) -> Point2d {
        Point2d { x, y }
    }

    pub(crate) fn scale_orig(&self, xy_scale: f64) -> Point2d {
        Point2d::new(xy_scale * self.x, xy_scale * self.y)
    }

    pub(crate) fn scale(&self, xy_scale: f64, origin: &Point2d) -> Point2d {
        Point2d::new(
            origin.x + xy_scale * (self.x - origin.x),
            origin.y + xy_scale * (self.y - origin.y),
        )
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
        return self.scale(1.0 / self.norm(), &Point2d::new(0.0, 0.0));
    }
}
impl fmt::Display for Point2d {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        write!(f, "({}, {})", self.x.round(), self.y.round())
    }
}
