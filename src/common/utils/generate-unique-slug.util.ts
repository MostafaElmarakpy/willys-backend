import slugify from "slugify";
import { Repository } from "typeorm";
import {
  BilingualString,
  BilingualStringObject,
} from "../dto/bilingual-string.dto";

interface SlugGenerationOptions {
  maxLength?: number;
  maxAttempts?: number;
  suffix?: string;
  customSeparator?: string;
}

interface HasSlugField {
  slug: BilingualString;
}

/**
 * Configuration for slug generation
 */
const SLUG_CONFIG = {
  DEFAULT_MAX_LENGTH: 100,
  DEFAULT_MAX_ATTEMPTS: 50,
  DEFAULT_SEPARATOR: "-",
  ARABIC_UNICODE_RANGE: /[\u0600-\u06FF]/g,
  ENGLISH_SLUG_OPTIONS: {
    lower: true,
    strict: true,
    remove: /[*+~.()'"!:@#$%^&*=+<>?/\\|`{}[\]]/g,
    trim: true,
  },
} as const;

/**
 * Generates a URL-friendly slug from English text
 */
function generateEnglishSlug(
  name: string,
  options: SlugGenerationOptions = {},
): string {
  if (!name?.trim()) {
    throw new Error("Name cannot be empty for English slug generation");
  }

  const { maxLength = SLUG_CONFIG.DEFAULT_MAX_LENGTH, customSeparator } =
    options;

  const slugOptions = {
    ...SLUG_CONFIG.ENGLISH_SLUG_OPTIONS,
    replacement: customSeparator || SLUG_CONFIG.DEFAULT_SEPARATOR,
  };

  let slug = slugify(name, slugOptions);

  // Ensure slug doesn't start or end with separator
  slug = slug.replace(
    new RegExp(
      `^${slugOptions.replacement}+|${slugOptions.replacement}+$`,
      "g",
    ),
    "",
  );

  // Limit length if specified
  if (maxLength && slug.length > maxLength) {
    slug = slug.substring(0, maxLength);
    // Ensure we don't cut in the middle of a word
    const lastSeparator = slug.lastIndexOf(slugOptions.replacement);
    if (lastSeparator > maxLength * 0.8) {
      // Only trim if separator is near the end
      slug = slug.substring(0, lastSeparator);
    }
  }

  return slug || "untitled"; // Fallback if slug becomes empty
}

/**
 * Generates a URL-friendly slug from Arabic text
 */
function generateArabicSlug(
  name: string,
  options: SlugGenerationOptions = {},
): string {
  if (!name?.trim()) {
    throw new Error("Name cannot be empty for Arabic slug generation");
  }

  const {
    maxLength = SLUG_CONFIG.DEFAULT_MAX_LENGTH,
    customSeparator = SLUG_CONFIG.DEFAULT_SEPARATOR,
  } = options;

  let slug = name
    .normalize("NFKD") // Normalize Unicode
    .trim()
    .replace(/[\s_\u00A0]+/g, customSeparator) // Replace whitespace and non-breaking spaces
    .replace(new RegExp(`[^a-z0-9\\u0600-\\u06FF${customSeparator}]`, "gi"), "") // Keep Arabic, English, numbers, and separators
    .replace(new RegExp(`${customSeparator}+`, "g"), customSeparator) // Remove duplicate separators
    .toLowerCase();

  // Remove leading/trailing separators
  slug = slug.replace(
    new RegExp(`^${customSeparator}+|${customSeparator}+$`, "g"),
    "",
  );

  // Limit length if specified
  if (maxLength && slug.length > maxLength) {
    slug = slug.substring(0, maxLength);
    const lastSeparator = slug.lastIndexOf(customSeparator);
    if (lastSeparator > maxLength * 0.8) {
      slug = slug.substring(0, lastSeparator);
    }
  }

  return slug || "غير-مسمى"; // Arabic fallback
}

/**
 * Checks if a slug already exists in the database
 */
async function checkSlugExists<T extends HasSlugField>(
  repository: Repository<T>,
  slug: BilingualString,
  excludeId?: string | number,
): Promise<boolean> {
  const queryBuilder = repository
    .createQueryBuilder("entity")
    .where(`entity.slug ->> 'en' = :en OR entity.slug ->> 'ar' = :ar`, {
      en: slug.en,
      ar: slug.ar,
    });

  if (excludeId !== undefined) {
    queryBuilder.andWhere("entity.id != :excludeId", { excludeId });
  }

  const existing = await queryBuilder.getOne();
  return !!existing;
}

/**
 * Generates a unique bilingual slug by appending numbers if conflicts exist
 */
export async function generateUniqueSlug<T extends HasSlugField>(
  repository: Repository<T>,
  name: BilingualStringObject,
  options: SlugGenerationOptions = {},
  excludeId?: string | number,
): Promise<BilingualString> {
  if (!name?.en?.trim() || !name?.ar?.trim()) {
    throw new Error("Both English and Arabic names are required");
  }

  const { maxAttempts = SLUG_CONFIG.DEFAULT_MAX_ATTEMPTS, suffix = "" } =
    options;

  try {
    // Generate base slugs
    const baseSlugEn = generateEnglishSlug(name.en, options);
    const baseSlugAr = generateArabicSlug(name.ar, options);

    let currentSlug: BilingualString = {
      en: suffix ? `${baseSlugEn}-${suffix}` : baseSlugEn,
      ar: suffix ? `${baseSlugAr}-${suffix}` : baseSlugAr,
    };

    // Check if base slug is unique
    const isBaseUnique = !(await checkSlugExists(
      repository,
      currentSlug,
      excludeId,
    ));
    if (isBaseUnique) {
      return currentSlug;
    }

    // Find unique slug by appending numbers
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      const suffixToUse = suffix ? `${suffix}-${attempt}` : attempt.toString();

      currentSlug = {
        en: `${baseSlugEn}-${suffixToUse}`,
        ar: `${baseSlugAr}-${suffixToUse}`,
      };

      const exists = await checkSlugExists(repository, currentSlug, excludeId);
      if (!exists) {
        return currentSlug;
      }
    }

    // If we've exhausted attempts, generate a timestamp-based slug
    const timestamp = Date.now();
    return {
      en: `${baseSlugEn}-${timestamp}`,
      ar: `${baseSlugAr}-${timestamp}`,
    };
  } catch (error) {
    throw new Error(
      `Failed to generate unique slug: ${error instanceof Error ? error.message : "Unknown error"}`,
    );
  }
}

/**
 * Updates an existing entity's slug if the name has changed
 */
export async function updateSlugIfNeeded<T extends HasSlugField>(
  repository: Repository<T>,
  entity: T,
  newName: BilingualStringObject,
  options: SlugGenerationOptions = {},
): Promise<BilingualString> {
  const newSlug = await generateUniqueSlug(
    repository,
    newName,
    options,
    (entity as any).id,
  );

  // Only update if slug has actually changed
  if (newSlug.en !== entity.slug.en || newSlug.ar !== entity.slug.ar) {
    return newSlug;
  }

  return entity.slug;
}

/**
 * Validates a slug format without checking database uniqueness
 */
export function validateSlugFormat(slug: BilingualString): {
  isValid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (!slug.en?.trim()) {
    errors.push("English slug is required");
  } else if (!/^[a-z0-9-]+$/.test(slug.en)) {
    errors.push("English slug contains invalid characters");
  } else if (slug.en.startsWith("-") || slug.en.endsWith("-")) {
    errors.push("English slug cannot start or end with hyphens");
  }

  if (!slug.ar?.trim()) {
    errors.push("Arabic slug is required");
  } else if (!/^[a-z0-9\u0600-\u06FF-]+$/i.test(slug.ar)) {
    errors.push("Arabic slug contains invalid characters");
  } else if (slug.ar.startsWith("-") || slug.ar.endsWith("-")) {
    errors.push("Arabic slug cannot start or end with hyphens");
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * Utility to regenerate all slugs for existing entities (migration helper)
 */
export async function regenerateAllSlugs<T extends HasSlugField>(
  repository: Repository<T>,
  getNameCallback: (entity: T) => BilingualStringObject,
  options: SlugGenerationOptions = {},
  batchSize: number = 100,
): Promise<void> {
  const totalCount = await repository.count();
  let processed = 0;

  while (processed < totalCount) {
    const entities = await repository.find({
      skip: processed,
      take: batchSize,
    });

    for (const entity of entities) {
      try {
        const name = getNameCallback(entity);
        const newSlug = await generateUniqueSlug(
          repository,
          name,
          options,
          (entity as any).id,
        );

        if (newSlug.en !== entity.slug.en || newSlug.ar !== entity.slug.ar) {
          await repository.update((entity as any).id, { slug: newSlug } as any);
        }
      } catch (error) {
        console.error(
          `Failed to regenerate slug for entity ${(entity as any).id}:`,
          error,
        );
      }
    }

    processed += entities.length;
    console.log(`Processed ${processed}/${totalCount} entities`);
  }
}
