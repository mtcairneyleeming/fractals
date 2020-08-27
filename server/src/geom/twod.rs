use super::line::Line2d;
use super::point::Point2d;

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
