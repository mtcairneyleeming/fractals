use super::line::*;
use std::fmt::{Debug, Display};

#[derive(Debug)]
pub struct Layer<T>
where
    T: Line + Copy + Debug + Display,
{
    lines: Vec<T>,
    length: f64,
    fracs: Vec<f64>,
}

impl<T> Layer<T>
where
    T: Line + Copy + Debug + Display,
{
    pub fn new(lines: Vec<T>) -> Self {
        let mut length = 0.0;
        let mut fracs = vec![0.0];
        for line in &lines {
            length += line.length();
            fracs.push(length);
        }

        Self { lines, length, fracs }
    }
    pub fn length(&self) -> f64 {
        self.length
    }
    pub fn count(&self) -> usize {
        self.lines.len()
    }
    pub fn lines(&self) -> &Vec<T> {
        &self.lines
    }
    pub fn first(&self) -> T {
        self.lines[0]
    }
    pub fn last(&self) -> T {
        self.lines[self.count() - 1]
    }

    pub fn get_section(&self, start: f64, end: f64) -> Vec<T> {
        return if self.count() == 0 {
            panic!("Cannot get section of empty layer");
        } else {
            let mut out: Vec<T> = Vec::new();
            for i in 0..self.count() {
                if end >= self.fracs[i] / self.length && start <= self.fracs[i + 1] / self.length {
                    let line_frac = (self.fracs[i + 1] - self.fracs[i]) / self.length;
                    out.push(self.lines[i].section(
                        (start - self.fracs[i] / self.length) / line_frac,
                        (end - self.fracs[i] / self.length) / line_frac,
                    ));
                }
            }
            out
        };
    }
}

impl Layer<Line3d> {
    pub(crate) fn thicken(&self, offset: f64) -> Layer<ThickLine3d> {
        let mut lines = vec![];
        // input
        let orig_lines = &self.lines;

        match orig_lines.len() {
            0 => panic!("Failure: cannot thicken an empty layer."),
            1 => {
                lines.push(orig_lines[0].thicken(offset, None, None));
            }
            _ => {
                // sort out first
                lines.push(orig_lines[0].thicken(offset, None, Some(orig_lines[1])));

                // do middle ones
                for i in 1..orig_lines.len() - 1 {
                    lines.push(orig_lines[i].thicken(
                        offset,
                        Some(orig_lines[i - 1]),
                        Some(orig_lines[i + 1]),
                    ));
                }
                // sort out last
                let last = orig_lines.len() - 1;
                lines.push(orig_lines[last].thicken(offset, Some(orig_lines[last - 1]), None));
            }
        };

        return Layer::<ThickLine3d>::new(lines);
    }
}
