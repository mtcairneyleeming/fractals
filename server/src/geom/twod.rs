use std::fmt;

#[derive(Copy, Clone)]
pub(crate) struct Line2d {
    pub start: Point2d,
    pub end: Point2d,
    pub length: f64,
}
impl Line2d {
    pub fn new(start: Point2d, end: Point2d) -> Self {
        let dx = start.x - end.x;
        let dy = start.y - end.y;
        Line2d {
            start,
            end,
            length: (dx * dx + dy * dy).sqrt(),
        }
    }

    pub fn direction(&self) -> Point2d {
        return self.end.sub(self.start).unit();
    }

    pub fn point(&self, pos: f64) -> Point2d {
        if pos < 1e-8 {
            self.start
        } else if pos > 1.0 - 1e-8 {
            self.end
        } else {
            Point2d::new(
                self.start.x + pos * (self.end.x - self.start.x),
                self.start.y + pos * (self.end.y - self.start.y),
            )
        }
    }
}

impl fmt::Display for Line2d {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        write!(f, "{}->{}", self.start, self.end)
    }
}
impl fmt::Debug for Line2d {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        write!(f, "{}->{}", self.start, self.end)
    }
}

#[derive(Copy, Clone, Debug)]
pub(crate) struct Point2d {
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

#[derive(Copy, Clone)]
pub(crate) struct Tri2d {
    a: Point2d,
    b: Point2d,
    c: Point2d,
}

impl Tri2d {
    pub fn from_sp(s: Line2d, p: Point2d) -> Self {
        Tri2d {
            a: s.start,
            b: s.end,
            c: p,
        }
    }

    pub fn sides(&self) -> [Line2d; 3] {
        return [
            Line2d::new(self.a, self.b),
            Line2d::new(self.a, self.c),
            Line2d::new(self.b, self.c),
        ];
    }

    pub fn contains_point(&self, p: Point2d) -> bool {
        let sign = |l: &Line2d| -> f64 {
            return (p.x - l.end.x) * (l.start.y - l.end.y) - (l.start.x - l.end.x) * (p.y - l.end.y);
        };
        let sides = self.sides();
        let ds = sides.iter().map(sign).collect::<Vec<f64>>();
        let has_neg = (ds[0] < 0.0) || (ds[1] < 0.0) || (ds[2] < 0.0);
        let has_pos = (ds[0] > 0.0) || (ds[1] > 0.0) || (ds[2] > 0.0);

        !(has_neg && has_pos)
    }
}
