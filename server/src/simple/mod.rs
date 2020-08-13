mod thick;
mod thin;
mod util;
pub mod curves;
mod holes;

pub use thick::*;
pub use thin::simple_thin;
pub use util::fix_tris_n;
pub(crate) use holes::HoleOptions;
