use super::point::*;
use super::threed::{Trapezium3d, Tri3d};
use core::fmt::Debug;
use serde::Deserialize;
use std::f64::consts;
use std::fmt;


pub trait Line: Debug + Sized {
    fn start(&self) -> Point3d;
    fn end(&self) -> Point3d;

    fn length(&self) -> f64;
    fn section(&self, s: f64, e: f64) -> Self;
    fn point(&self, p: f64) -> Point3d;
    fn direction(&self) -> Point3d;
    fn to2d(&self) -> Line2d;

    fn is_parallel_to(&self, other: Self) -> bool {
        self.to2d().is_parallel_to(other.to2d())
    }

    fn join_to(self, other: Self, steps: i64) -> Vec<Tri3d> {
        self.join_non_parallel(other, steps, None)
    }
    fn join_to_with_hole(self, other: Self, frame: f64) -> Vec<Tri3d>;
    fn join_non_parallel(self, other: Self, steps: i64, skips: Option<(i64, i64)>) -> Vec<Tri3d>;

    // so we can draw edges round the thick lines
    fn draw_layer(layer: &Vec<Self>) -> Vec<Tri3d>;

    fn draw_edges(curr: &Vec<Self>, prev: &Vec<Self>, steps: i64) -> Vec<Tri3d>;
}


#[derive(Clone, Copy, Deserialize)]
pub struct Line3d {
    start: Point3d,
    end: Point3d,
    length: f64,
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
}
impl Line for Line3d {
    fn point(&self, pos: f64) -> Point3d {
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

    fn section(&self, start_frac: f64, end_frac: f64) -> Line3d {
        return Line3d::new(self.point(start_frac), self.point(end_frac));
    }

    fn direction(&self) -> Point3d {
        return self.end.sub(self.start).unit();
    }
    fn start(&self) -> Point3d {
        self.start
    }

    fn end(&self) -> Point3d {
        self.end
    }
    fn length(&self) -> f64 {
        self.length
    }

    fn to2d(&self) -> Line2d {
        return Line2d::new(self.start.to2d(), self.end.to2d());
    }

    /// Join two parallel lines with a polygon with a hole cut out of it
    fn join_to_with_hole(self, b: Line3d, frame_factor: f64) -> Vec<Tri3d> {
        let a = self;
        let trap = Trapezium3d::from_parallel_lines(a, b);
        let hole_trap = trap.hole(frame_factor);
        if hole_trap.is_none() {
            return self.join_to(b, 1);
        }
        let mut tris = vec![];
        for i in 0..4 {
            tris.extend_from_slice(
                &(join_planar_lines(
                    trap.plane.unproject_line(trap.edges[i]),
                    trap.plane.unproject_line(hole_trap.unwrap().edges[i]),
                )),
            );
        }
        tris
    }

    fn join_non_parallel(self, b: Self, steps: i64, skips: Option<(i64, i64)>) -> Vec<Tri3d> {
        let a = self;
        let mut tris = Vec::new();
        let starts = Line3d::new(a.start, b.start);
        let ends = Line3d::new(a.end, b.end);

        if skips.is_some() {
            let (f, u) = skips.unwrap();
            if f < 1 || u > steps - 1 || u <= f {
                panic!("Step ranges malformed: f {}, u {}, steps {}", f, u, steps)
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
            if skips.is_none() || (i <= skips.unwrap().0 || i > skips.unwrap().1) {
                tris.extend_from_slice(&join_planar_lines(prev, new_line));
            }
            prev = new_line;
        }
        tris
    }

    fn draw_layer(_layer: &Vec<Self>) -> Vec<Tri3d> {
        vec![]
    }

    fn draw_edges(_curr: &Vec<Self>, _prev: &Vec<Self>, _steps: i64) -> Vec<Tri3d> {
        vec![]
    }
}

pub(super) fn join_planar_lines(a: Line3d, b: Line3d) -> [Tri3d; 2] {
    return [Tri3d::from_sp(&a, &b.start), Tri3d::from_sp(&b, &a.end)];
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

#[derive(Clone, Copy, Deserialize, Debug)]
pub(crate) struct ThickLine3d {
    original: Line3d,
    outer: Line3d,
    inner: Line3d,
}
impl ThickLine3d {
    pub(crate) fn new(original: Line3d, outer: Line3d, inner: Line3d) -> ThickLine3d {
        ThickLine3d {
            original,
            outer,
            inner,
        }
    }
}

impl Line for ThickLine3d {
    fn point(&self, pos: f64) -> Point3d {
        if pos < EPS {
            self.original.start
        } else if pos > 1.0 - EPS {
            self.original.end
        } else {
            self.original.start.add(self.original.direction().scale(pos))
        }
    }

    fn section(&self, start_frac: f64, end_frac: f64) -> ThickLine3d {
        return ThickLine3d {
            original: self.original.section(start_frac, end_frac),
            inner: self.inner.section(start_frac, end_frac),
            outer: self.outer.section(start_frac, end_frac),
        };
    }

    fn direction(&self) -> Point3d {
        return self.original.direction(); // though same for all
    }
    fn start(&self) -> Point3d {
        self.original.start
    }

    fn end(&self) -> Point3d {
        self.original.end
    }
    fn length(&self) -> f64 {
        self.original.length
    }

    fn to2d(&self) -> Line2d {
        self.original.to2d()
    }
    fn join_to_with_hole(self, other: Self, frame: f64) -> Vec<Tri3d> {
        let mut tris = vec![];
        // note each pair are on the same plane
        let inner_trap = Trapezium3d::from_parallel_lines(self.inner, other.inner);
        let op_inner_hole = inner_trap.hole(frame);
        let outer_trap = Trapezium3d::from_parallel_lines(self.outer, other.outer);
        let op_outer_hole = outer_trap.hole(frame);
        if op_inner_hole.is_none() || op_outer_hole.is_none() {
            return self.join_to(other, 1); // since parallel
        }
        let inner_hole = op_inner_hole.unwrap();
        let outer_hole = op_outer_hole.unwrap();
        for i in 0..4 {
            // inner tris
            tris.extend_from_slice(
                &(join_planar_lines(
                    inner_trap.plane.unproject_line(inner_trap.edges[i]),
                    inner_hole.plane.unproject_line(inner_hole.edges[i]),
                )),
            );
            // outer tris
            tris.extend_from_slice(
                &(join_planar_lines(
                    outer_trap.plane.unproject_line(outer_trap.edges[i]),
                    outer_hole.plane.unproject_line(outer_hole.edges[i]),
                )),
            );
            // link outer & inner
            tris.extend_from_slice(
                &(join_planar_lines(
                    outer_hole.plane.unproject_line(outer_hole.edges[i]),
                    inner_hole.plane.unproject_line(inner_hole.edges[i]),
                )),
            );
        }
        tris
    }
    fn join_non_parallel(self, other: Self, steps: i64, skips: Option<(i64, i64)>) -> Vec<Tri3d> {
        let mut tris = vec![];
        tris.extend(self.inner.join_non_parallel(other.inner, steps, skips));

        tris.extend(self.outer.join_non_parallel(other.outer, steps, skips));
        if skips.is_some() {
            let (from, until) = skips.unwrap();
            // TODO why???
            let top_thickness = (from - 1) as f64 / steps as f64;

            let bottom_thickness = (until - 1) as f64 / steps as f64;
            // joins to make solid
            let outer_start = Line3d::new(other.outer.start, self.outer.start);
            let inner_start = Line3d::new(other.inner.start, self.inner.start);
            let outer_end = Line3d::new(other.outer.end, self.outer.end);
            let inner_end = Line3d::new(other.inner.end, self.inner.end);
            tris.extend_from_slice(&join_planar_lines(
                Line3d::new(outer_start.point(top_thickness), outer_end.point(top_thickness)),
                Line3d::new(inner_start.point(top_thickness), inner_end.point(top_thickness)),
            ));
            tris.extend_from_slice(&join_planar_lines(
                Line3d::new(
                    inner_start.point(bottom_thickness),
                    inner_end.point(bottom_thickness),
                ),
                Line3d::new(
                    outer_start.point(bottom_thickness),
                    outer_end.point(bottom_thickness),
                ),
            ));
        }
        tris
    }

    fn draw_layer(layer: &Vec<Self>) -> Vec<Tri3d> {
        let mut tris = vec![];

        for i in 0..layer.len() {
            tris.extend_from_slice(&join_planar_lines(layer[i].inner, layer[i].outer));
        }
        return tris;
    }

    fn draw_edges(curr: &Vec<Self>, prev: &Vec<Self>, steps: i64) -> Vec<Tri3d> {
        let mut tris = vec![];
        tris.extend(
            Line3d::new(curr[0].inner.start, curr[0].outer.start).join_non_parallel(
                Line3d::new(prev[0].inner.start, prev[0].outer.start),
                steps,
                None,
            ),
        );
        tris.extend(
            Line3d::new(curr.last().unwrap().inner.end, curr.last().unwrap().outer.end).join_non_parallel(
                Line3d::new(prev.last().unwrap().inner.end, prev.last().unwrap().outer.end),
                steps,
                None,
            ),
        );
        tris
    }
}


#[derive(Copy, Clone)]
pub struct Line2d {
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
    pub fn is_parallel_to(&self, other: Line2d) -> bool {
        let a = self;
        let b = other;
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
