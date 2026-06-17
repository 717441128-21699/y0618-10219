export function formatEnergy(value: number, decimals: number = 2): string {
  const abs = Math.abs(value);
  if (abs >= 1000) {
    return `${(value / 1000).toFixed(decimals)} TeV`;
  } else if (abs >= 1) {
    return `${value.toFixed(decimals)} GeV`;
  } else if (abs >= 0.001) {
    return `${(value * 1000).toFixed(decimals)} MeV`;
  }
  return `${(value * 1e6).toFixed(decimals)} keV`;
}

export function formatMomentum(value: number, decimals: number = 2): string {
  return formatEnergy(value, decimals);
}

export function formatMass(value: number, decimals: number = 3): string {
  const abs = Math.abs(value);
  if (abs >= 1) {
    return `${value.toFixed(decimals)} GeV/c²`;
  } else if (abs >= 0.001) {
    return `${(value * 1000).toFixed(decimals)} MeV/c²`;
  }
  return `${(value * 1e6).toFixed(decimals)} keV/c²`;
}

export function formatDistance(value: number, decimals: number = 2): string {
  const abs = Math.abs(value);
  if (abs >= 100) {
    return `${(value / 1000).toFixed(decimals)} m`;
  } else if (abs >= 0.1) {
    return `${value.toFixed(decimals)} mm`;
  }
  return `${(value * 1000).toFixed(decimals)} μm`;
}

export function formatAngle(value: number, decimals: number = 3): string {
  return `${value.toFixed(decimals)} rad`;
}

export function formatEtaPhi(eta: number, phi: number): string {
  return `η=${eta.toFixed(2)}, φ=${phi.toFixed(2)}`;
}

export function formatCount(value: number): string {
  if (value >= 1e6) {
    return `${(value / 1e6).toFixed(2)}M`;
  } else if (value >= 1e3) {
    return `${(value / 1e3).toFixed(2)}k`;
  }
  return `${value}`;
}

export function formatScientific(value: number, sigFigs: number = 3): string {
  if (value === 0) return '0';
  const exp = Math.floor(Math.log10(Math.abs(value)));
  const mantissa = value / Math.pow(10, exp);
  return `${mantissa.toFixed(sigFigs - 1)}×10^${exp}`;
}

export function formatTimestamp(ts: number): string {
  const date = new Date(ts * 1000);
  return date.toISOString().replace('T', ' ').replace(/\.\d+Z$/, ' UTC');
}
