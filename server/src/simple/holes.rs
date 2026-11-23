use serde::{Deserialize, Serialize};

/// Hole options. The frontend sends these in the shape the old rmp-serde (0.13) used for enums,
/// `[variant_index, [field, ...]]` (see `settings.ts`); modern rmp-serde would write
/// `{"Variant": [fields]}` instead. Both are accepted when deserializing (see `HoleWire`).
#[derive(Deserialize, Debug, Serialize, Clone, PartialEq)]
#[serde(try_from = "HoleWire")]
pub enum HoleOptions {
    None,
    ParallelOnly {
        frame_factor: f64,
    },
    Everywhere {
        num_holes: i64,
        ratio: f64,
        scaling_factor: i64,
        frame_factor: f64,
    },
}

/// The two accepted encodings of `HoleOptions`.
#[derive(Deserialize)]
#[serde(untagged)]
enum HoleWire {
    /// `[variant_index, [fields...]]`, as the frontend sends it.
    Legacy(u32, Vec<f64>),
    /// serde's usual external tagging: `"None"`, `{"ParallelOnly": {...}}`, ...
    Native(NativeHoleOptions),
}

#[derive(Deserialize)]
enum NativeHoleOptions {
    None,
    ParallelOnly {
        frame_factor: f64,
    },
    Everywhere {
        num_holes: i64,
        ratio: f64,
        scaling_factor: i64,
        frame_factor: f64,
    },
}

impl TryFrom<HoleWire> for HoleOptions {
    type Error = String;

    fn try_from(wire: HoleWire) -> Result<Self, String> {
        match wire {
            HoleWire::Legacy(0, f) if f.is_empty() => Ok(HoleOptions::None),
            HoleWire::Legacy(1, f) if f.len() == 1 => Ok(HoleOptions::ParallelOnly { frame_factor: f[0] }),
            HoleWire::Legacy(2, f) if f.len() == 4 => {
                let int = |x: f64| {
                    if x.fract() == 0.0 && x.abs() < 9.0e15 {
                        Ok(x as i64)
                    } else {
                        Err(format!("expected an integer, got {x}"))
                    }
                };
                Ok(HoleOptions::Everywhere {
                    num_holes: int(f[0])?,
                    ratio: f[1],
                    scaling_factor: int(f[2])?,
                    frame_factor: f[3],
                })
            }
            HoleWire::Legacy(i, f) => Err(format!("invalid hole options: variant {i} with {} fields", f.len())),
            HoleWire::Native(NativeHoleOptions::None) => Ok(HoleOptions::None),
            HoleWire::Native(NativeHoleOptions::ParallelOnly { frame_factor }) => {
                Ok(HoleOptions::ParallelOnly { frame_factor })
            }
            HoleWire::Native(NativeHoleOptions::Everywhere { num_holes, ratio, scaling_factor, frame_factor }) => {
                Ok(HoleOptions::Everywhere { num_holes, ratio, scaling_factor, frame_factor })
            }
        }
    }
}


pub(super) fn calc_hole_regions(hole_options: &HoleOptions, hole_scale: i64) -> (Vec<f64>, i64) {
    if let HoleOptions::Everywhere {
        num_holes: orig_num,
        ratio,
        scaling_factor,
        frame_factor: _,
    } = hole_options
    {
        let num_holes = orig_num * hole_scale;
        let pair_frac = 1.0 / num_holes as f64;
        let spacing_frac = ratio / (1.0 + ratio) * pair_frac;
        let hole_frac = 1.0 / (1.0 + ratio) * pair_frac;
        let mut regions = vec![];
        let mut pos = 0.0;
        regions.push(0.0);
        pos += 0.5 * spacing_frac;
        regions.push(pos);

        for _ in 1..num_holes {
            pos += hole_frac;
            regions.push(pos);
            pos += spacing_frac;
            regions.push(pos);
        }
        pos += hole_frac;
        regions.push(pos);
        regions.push(1.0);
        (regions, hole_scale * scaling_factor)
    } else {
        (vec![], 0)
    }
}
