// ========================================================================
// HOPE Group4: PRODUCT CONSTANTS, PARSERS & HELPERS
// Strictly operates on PRODUCT(prodCode, description, unit) and PRICEHIST.
// Zero new columns. Zero external fields.
// ========================================================================

export const FAMILY_LABELS: Record<string, string> = {
  // Canonical Coursework Product Families (HopeDB_audit.sql)
  AD: 'External Storage',
  AK: 'Keyboards & Devices',
  AM: 'Mice & Input',
  AP: 'Projectors & Displays',
  MD: 'Media & Flash Drives',
  MP: 'Multifunction Printers',
  NB: 'Notebooks & Laptops',
  NH: 'Network Hubs & Routers',
  NT: 'Network Equipment',
  PA: 'Power Adapters & Surge',
  PC: 'Power Components',
  PF: 'Cooling Fans',
  PR: 'Printers & Scanners',
  PS: 'Audio & Speakers',
  // Legacy / PC Component fallbacks
  CPU: 'Processors',
  GPU: 'Graphics cards',
  MB: 'Motherboards',
  RAM: 'Memory',
  SSD: 'Solid-state drives',
  PSU: 'Power supplies',
  CASE: 'Cases',
  MON: 'Monitors',
  KB: 'Keyboards',
  MS: 'Mice',
};

/**
 * Extracts family prefix from a product code:
 * - Coursework canonical: 'AD0001' -> 'AD'
 * - Hyphenated fallback: 'CPU-R5-5600' -> 'CPU'
 */
export function getProductFamily(prodCode: string): string {
  if (!prodCode) return 'OTHER';
  const clean = prodCode.trim().toUpperCase();
  if (clean.includes('-')) {
    return clean.split('-')[0] || 'OTHER';
  }
  const match = clean.match(/^([A-Z]{2,4})/);
  if (match) {
    return match[1];
  }
  return 'OTHER';
}

/**
 * Returns human-readable label for family code prefix.
 */
export function getFamilyLabel(family: string): string {
  const upper = family.toUpperCase();
  return FAMILY_LABELS[upper] || upper;
}

export type ProductCategory = string;

export interface ParsedProduct {
  prodCode: string;
  category: string;
  categoryPrefix: string;
  title: string;
  specs: string[];
  unit: string;
  rawDescription: string;
}

export function getProductCategory(prodCode: string): { category: string; prefix: string } {
  const prefix = getProductFamily(prodCode);
  return {
    category: getFamilyLabel(prefix),
    prefix,
  };
}

export function parseProductDescription(
  prodCode: string,
  description: string,
  unit: string = 'pc'
): ParsedProduct {
  const { category, prefix } = getProductCategory(prodCode);
  const segments = (description || '').split('|').map((s) => s.trim()).filter(Boolean);
  const title = segments[0] || prodCode;
  const specs = segments.slice(1);

  return {
    prodCode,
    category,
    categoryPrefix: prefix,
    title,
    specs,
    unit,
    rawDescription: description,
  };
}

/**
 * Description rendering as agreed during alignment:
 * Primary product title comes from first segment, remaining details form subtitle.
 */
export function splitDescription(rawDescription: string): { title: string; detail: string } {
  if (!rawDescription) return { title: '', detail: '' };
  const segments = rawDescription.split('|').map((s) => s.trim()).filter(Boolean);
  if (segments.length <= 1) {
    return { title: rawDescription.trim(), detail: '' };
  }
  return {
    title: segments[0],
    detail: segments.slice(1).join(' · '),
  };
}

/**
 * Computes price change label and numeric details between current and previous price.
 * Format: "Up ₱500.00 (6.0%)", "Down ₱500.00 (5.6%)", or "First price".
 */
export function formatPriceChange(
  currentPrice: number | null,
  previousPrice: number | null
): {
  label: string;
  diff: number | null;
  percent: number | null;
  direction: 'UP' | 'DOWN' | 'SAME' | 'FIRST';
} {
  if (currentPrice === null) {
    return { label: 'No price record', diff: null, percent: null, direction: 'SAME' };
  }
  if (previousPrice === null || previousPrice === undefined) {
    return { label: 'First price', diff: null, percent: null, direction: 'FIRST' };
  }
  const diff = currentPrice - previousPrice;
  if (Math.abs(diff) < 0.001) {
    return { label: 'No change', diff: 0, percent: 0, direction: 'SAME' };
  }

  const percent = (Math.abs(diff) / previousPrice) * 100;
  const formattedDiff = new Intl.NumberFormat('en-PH', {
    style: 'currency',
    currency: 'PHP',
    minimumFractionDigits: 2,
  }).format(Math.abs(diff));

  if (diff > 0) {
    return {
      label: `Up ${formattedDiff} (${percent.toFixed(1)}%)`,
      diff,
      percent,
      direction: 'UP',
    };
  } else {
    return {
      label: `Down ${formattedDiff} (${percent.toFixed(1)}%)`,
      diff,
      percent,
      direction: 'DOWN',
    };
  }
}

/**
 * Common hardware brands for structural code assignment.
 */
export const KNOWN_BRANDS = [
  'AMD',
  'INTEL',
  'NVIDIA',
  'GIGABYTE',
  'ASUS',
  'MSI',
  'ASROCK',
  'CORSAIR',
  'KINGSTON',
  'SAMSUNG',
  'CRUCIAL',
  'DEEPCOOL',
  'VIEWSONIC',
  'REDRAGON',
  'LOGITECH',
  'RAZER',
  'NZXT',
  'WD',
  'SEAGATE',
  'SEASONIC',
  'EVGA',
  'THERMALTAKE',
  'COOLERMASTER',
  'AOC',
  'ACER',
  'DELL',
  'BENQ',
  'LG',
  'KEYCHRON',
] as const;

/**
 * Detects Category and Brand from an item description (e.g. "Ryzen 5 5600G" -> CPU, AMD)
 */
export function detectCategoryAndBrand(description: string): {
  category: string;
  brand: string;
  categoryLabel: string;
} {
  const text = (description || '').toLowerCase();

  // 1. Detect Category
  let category = 'MISC';
  if (/ryzen|intel|core\s*i[3579]|celeron|pentium|xeon|threadripper|processor|\bcpu\b/i.test(text)) {
    category = 'CPU';
  } else if (/geforce|radeon|rtx|gtx|rx\s*\d|graphics\s*card|\bgpu\b/i.test(text)) {
    category = 'GPU';
  } else if (
    /motherboard|b550|b650|b660|b760|x570|x670|z690|z790|a520|a620|h610|\bmb\b/i.test(text)
  ) {
    category = 'MB';
  } else if (/ddr4|ddr5|memory|\bram\b|sodimm/i.test(text)) {
    category = 'RAM';
  } else if (/nvme|sata|ssd|solid\s*state|m\.2/i.test(text)) {
    category = 'SSD';
  } else if (/power\s*supply|\bpsu\b|80\s*plus|bronze|gold|platinum|\d+w\b/i.test(text)) {
    category = 'PSU';
  } else if (/chassis|tower|case|tempered\s*glass|matx\s*case/i.test(text)) {
    category = 'CASE';
  } else if (/monitor|144hz|165hz|240hz|screen|\bmon\b|\bips\b/i.test(text)) {
    category = 'MON';
  } else if (/keyboard|mechanical|\bkb\b|tkl|switch/i.test(text)) {
    category = 'KB';
  } else if (/mouse|mice|dpi|\bms\b|optical/i.test(text)) {
    category = 'MS';
  }

  // 2. Detect Brand
  let brand = 'GEN';
  if (/amd|ryzen|radeon/i.test(text)) {
    brand = 'AMD';
  } else if (/intel|core\s*i[3579]|celeron|pentium/i.test(text)) {
    brand = 'INTEL';
  } else if (/nvidia|geforce|rtx|gtx/i.test(text)) {
    brand = 'NVIDIA';
  } else if (/gigabyte|aorus/i.test(text)) {
    brand = 'GIGABYTE';
  } else if (/asus|rog|tuf/i.test(text)) {
    brand = 'ASUS';
  } else if (/msi/i.test(text)) {
    brand = 'MSI';
  } else if (/asrock/i.test(text)) {
    brand = 'ASROCK';
  } else if (/corsair|vengeance/i.test(text)) {
    brand = 'CORSAIR';
  } else if (/kingston|fury/i.test(text)) {
    brand = 'KINGSTON';
  } else if (/samsung/i.test(text)) {
    brand = 'SAMSUNG';
  } else if (/crucial/i.test(text)) {
    brand = 'CRUCIAL';
  } else if (/deepcool/i.test(text)) {
    brand = 'DEEPCOOL';
  } else if (/viewsonic/i.test(text)) {
    brand = 'VIEWSONIC';
  } else if (/redragon/i.test(text)) {
    brand = 'REDRAGON';
  } else if (/logitech/i.test(text)) {
    brand = 'LOGITECH';
  } else if (/razer/i.test(text)) {
    brand = 'RAZER';
  } else if (/nzxt/i.test(text)) {
    brand = 'NZXT';
  } else if (/western\s*digital|\bwd\b/i.test(text)) {
    brand = 'WD';
  } else {
    // If not in known list, take the first word if it looks like an uppercase brand
    const firstWord = description.trim().split(/[\s|]+/)[0]?.toUpperCase();
    if (firstWord && /^[A-Z0-9]{2,10}$/.test(firstWord)) {
      brand = firstWord;
    }
  }

  return {
    category,
    brand,
    categoryLabel: getFamilyLabel(category),
  };
}

/**
 * Generates structured SKU code in the format: [CATEGORY]-[BRAND]-[SEQUENTIAL_NUMBER]
 * e.g., CPU-AMD-000008
 */
export function generateStructuredSkuCode(
  category: string,
  brand: string,
  existingCodes: string[] = []
): { code: string; seq: number; seqStr: string } {
  const cat = (category || 'MISC').trim().toUpperCase();
  const br = (brand || 'GEN').trim().toUpperCase();
  const prefix = `${cat}-${br}-`;

  // Find all existing codes matching `${cat}-${br}-\d+`
  let maxSeq = 0;
  for (const code of existingCodes) {
    const upper = code.toUpperCase();
    if (upper.startsWith(prefix)) {
      const rest = upper.slice(prefix.length);
      const num = parseInt(rest, 10);
      if (!isNaN(num) && num > maxSeq) {
        maxSeq = num;
      }
    }
  }

  const nextSeq = maxSeq + 1;
  const seqStr = String(nextSeq).padStart(6, '0');
  const code = `${cat}-${br}-${seqStr}`;

  return {
    code,
    seq: nextSeq,
    seqStr,
  };
}
