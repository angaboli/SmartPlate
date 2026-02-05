import jsPDF from 'jspdf';

// SmartPlate brand colors (from theme.css)
const COLORS = {
  primary: [47, 127, 109] as [number, number, number],    // #2F7F6D
  primaryLight: [234, 247, 243] as [number, number, number],
  accent: [233, 196, 106] as [number, number, number],    // #E9C46A
  orange: [244, 162, 97] as [number, number, number],     // #F4A261
  brown: [138, 106, 79] as [number, number, number],      // #8A6A4F
  dark: [30, 30, 30] as [number, number, number],
  muted: [120, 120, 120] as [number, number, number],
  light: [247, 247, 247] as [number, number, number],
  white: [255, 255, 255] as [number, number, number],
};

let logoCache: string | null = null;

async function loadLogo(): Promise<string | null> {
  if (logoCache) return logoCache;
  try {
    const res = await fetch('/SmartPlateLogo.jpg');
    const blob = await res.blob();
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = () => {
        logoCache = reader.result as string;
        resolve(logoCache);
      };
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

async function addHeader(doc: jsPDF, title: string, subtitle: string) {
  // Header background
  doc.setFillColor(...COLORS.primary);
  doc.rect(0, 0, 210, 40, 'F');

  // Try to add logo (maintain original 230:60 ratio = 3.83:1)
  const logo = await loadLogo();
  if (logo) {
    const logoW = 55;
    const logoH = logoW / (230 / 60); // ~14.4mm
    doc.addImage(logo, 'JPEG', 12, 4, logoW, logoH);
  } else {
    doc.setTextColor(...COLORS.white);
    doc.setFontSize(20);
    doc.setFont('helvetica', 'bold');
    doc.text('SmartPlate', 15, 17);
  }

  // Title
  doc.setTextColor(...COLORS.white);
  doc.setFontSize(11);
  doc.setFont('helvetica', 'normal');
  doc.text(title, 15, 30);

  // Date
  doc.setFontSize(9);
  doc.setTextColor(255, 255, 255, 0.8);
  doc.text(subtitle, 195, 30, { align: 'right' });

  // Accent bar
  doc.setFillColor(...COLORS.accent);
  doc.rect(0, 40, 210, 2.5, 'F');
}

function addFooter(doc: jsPDF, pageNum: number) {
  const y = 286;
  doc.setFillColor(...COLORS.primary);
  doc.rect(0, y, 210, 11, 'F');
  doc.setFontSize(7);
  doc.setTextColor(...COLORS.white);
  doc.text('smartplate.app', 15, y + 7);
  doc.text(`Page ${pageNum}`, 195, y + 7, { align: 'right' });
}

// ─── Grocery List PDF ────────────────────────────────

interface GroceryItem {
  name: string;
  quantity: string;
  category: string;
}

export async function generateGroceryPDF(
  items: GroceryItem[],
  checkedItems: Set<string>,
  lang: 'en' | 'fr',
) {
  const doc = new jsPDF();
  const date = new Date().toLocaleDateString(lang === 'fr' ? 'fr-FR' : 'en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const title = lang === 'fr' ? 'Liste de courses' : 'Grocery List';
  await addHeader(doc, title, date);

  const categories = Array.from(new Set(items.map((i) => i.category)));
  let y = 52;
  let page = 1;

  categories.forEach((category) => {
    const catItems = items.filter((i) => i.category === category);
    if (catItems.length === 0) return;

    // Check page break
    const needed = 16 + catItems.length * 9;
    if (y + needed > 278) {
      addFooter(doc, page);
      doc.addPage();
      page++;
      y = 20;
    }

    // Category header
    doc.setFillColor(...COLORS.primary);
    doc.roundedRect(15, y, 180, 10, 1.5, 1.5, 'F');
    doc.setTextColor(...COLORS.white);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.text(category.toUpperCase(), 20, y + 7);

    // Item count badge
    doc.setFillColor(...COLORS.accent);
    doc.roundedRect(175, y + 1.5, 18, 7, 1, 1, 'F');
    doc.setTextColor(...COLORS.dark);
    doc.setFontSize(7);
    doc.text(`${catItems.length}`, 184, y + 6.5, { align: 'center' });

    y += 14;

    // Items
    catItems.forEach((item, idx) => {
      if (y > 278) {
        addFooter(doc, page);
        doc.addPage();
        page++;
        y = 20;
      }

      const itemKey = `${item.name}-${item.quantity}`;
      const isChecked = checkedItems.has(itemKey);

      // Alternating row background
      if (idx % 2 === 0) {
        doc.setFillColor(...COLORS.light);
        doc.rect(15, y - 4.5, 180, 8, 'F');
      }

      // Checkbox
      doc.setDrawColor(180, 180, 180);
      doc.roundedRect(20, y - 3.5, 4, 4, 0.5, 0.5);
      if (isChecked) {
        doc.setFillColor(...COLORS.primary);
        doc.roundedRect(20.5, y - 3, 3, 3, 0.3, 0.3, 'F');
      }

      // Item name
      doc.setTextColor(isChecked ? 170 : 40, isChecked ? 170 : 40, isChecked ? 170 : 40);
      doc.setFontSize(9);
      doc.setFont('helvetica', isChecked ? 'italic' : 'normal');
      doc.text(item.name, 28, y);

      // Quantity pill
      doc.setFillColor(230, 230, 230);
      const qtyWidth = doc.getTextWidth(item.quantity) + 4;
      doc.roundedRect(195 - qtyWidth, y - 3.5, qtyWidth, 5.5, 1, 1, 'F');
      doc.setTextColor(...COLORS.muted);
      doc.setFontSize(8);
      doc.setFont('helvetica', 'normal');
      doc.text(item.quantity, 195 - qtyWidth / 2, y, { align: 'center' });

      y += 8;
    });

    y += 5;
  });

  // Summary box
  if (y + 18 > 278) {
    addFooter(doc, page);
    doc.addPage();
    page++;
    y = 20;
  }

  doc.setFillColor(...COLORS.primaryLight);
  doc.roundedRect(15, y, 180, 14, 2, 2, 'F');
  doc.setDrawColor(...COLORS.primary);
  doc.roundedRect(15, y, 180, 14, 2, 2, 'S');
  doc.setTextColor(...COLORS.primary);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  const totalLabel = lang === 'fr' ? 'Total' : 'Total';
  const checkedLabel = lang === 'fr' ? 'Coches' : 'Checked';
  doc.text(`${totalLabel}: ${items.length}  |  ${checkedLabel}: ${checkedItems.size} / ${items.length}`, 105, y + 9, { align: 'center' });

  addFooter(doc, page);

  const filename = `smartplate-courses-${new Date().toISOString().split('T')[0]}.pdf`;
  doc.save(filename);
}

// ─── Weekly Planner PDF ──────────────────────────────

interface Meal {
  id: string;
  name: string;
  calories: number;
  type: 'breakfast' | 'lunch' | 'dinner' | 'snack';
}

interface DayPlan {
  date: string;
  day: string;
  dayIndex: number;
  meals: Meal[];
}

const MEAL_TYPE_LABELS: Record<string, Record<string, string>> = {
  en: { breakfast: 'Breakfast', lunch: 'Lunch', dinner: 'Dinner', snack: 'Snack' },
  fr: { breakfast: 'Petit-dej', lunch: 'Dejeuner', dinner: 'Diner', snack: 'Collation' },
};

const MEAL_TYPE_COLORS: Record<string, [number, number, number]> = {
  breakfast: [233, 196, 106],   // gold
  lunch: [47, 127, 109],        // primary green
  dinner: [244, 162, 97],       // orange
  snack: [138, 106, 79],        // brown
};

const MEAL_TYPE_BG: Record<string, [number, number, number]> = {
  breakfast: [252, 246, 228],
  lunch: [234, 247, 243],
  dinner: [253, 241, 233],
  snack: [243, 238, 233],
};

export async function generatePlannerPDF(weekData: DayPlan[], lang: 'en' | 'fr') {
  const doc = new jsPDF();
  const date = new Date().toLocaleDateString(lang === 'fr' ? 'fr-FR' : 'en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const title = lang === 'fr' ? 'Planning repas hebdomadaire' : 'Weekly Meal Plan';
  await addHeader(doc, title, date);

  let y = 52;
  let page = 1;
  const mealLabels = MEAL_TYPE_LABELS[lang] || MEAL_TYPE_LABELS.en;

  weekData.forEach((day) => {
    const totalCal = day.meals.reduce((sum, m) => sum + m.calories, 0);
    const mealsNeeded = Math.max(day.meals.length, 1);
    const blockHeight = 16 + mealsNeeded * 10 + 6;

    if (y + blockHeight > 278) {
      addFooter(doc, page);
      doc.addPage();
      page++;
      y = 20;
    }

    // Day header
    doc.setFillColor(...COLORS.primary);
    doc.roundedRect(15, y, 180, 12, 1.5, 1.5, 'F');
    doc.setTextColor(...COLORS.white);
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text(day.day, 20, y + 8.5);

    // Date + total calories badge
    doc.setFillColor(...COLORS.accent);
    const calText = `${totalCal} kcal`;
    const calWidth = doc.getTextWidth(calText) + 6;
    doc.roundedRect(193 - calWidth, y + 2, calWidth, 8, 1, 1, 'F');
    doc.setTextColor(...COLORS.dark);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.text(calText, 193 - calWidth / 2, y + 7.5, { align: 'center' });

    // Date text
    doc.setTextColor(220, 240, 235);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.text(day.date, 193 - calWidth - 5, y + 7.5, { align: 'right' });

    y += 16;

    // Meals
    if (day.meals.length === 0) {
      doc.setTextColor(...COLORS.muted);
      doc.setFontSize(9);
      doc.setFont('helvetica', 'italic');
      const noMeals = lang === 'fr' ? 'Aucun repas planifie' : 'No meals planned';
      doc.text(noMeals, 25, y);
      y += 10;
    } else {
      day.meals.forEach((meal) => {
        if (y > 278) {
          addFooter(doc, page);
          doc.addPage();
          page++;
          y = 20;
        }

        // Meal row background
        const bgColor = MEAL_TYPE_BG[meal.type] || COLORS.light;
        doc.setFillColor(...bgColor);
        doc.roundedRect(18, y - 4, 174, 8.5, 1, 1, 'F');

        // Meal type color bar
        const color = MEAL_TYPE_COLORS[meal.type] || COLORS.muted;
        doc.setFillColor(...color);
        doc.rect(18, y - 4, 2.5, 8.5, 'F');

        // Meal type label
        doc.setTextColor(...color);
        doc.setFontSize(7);
        doc.setFont('helvetica', 'bold');
        doc.text((mealLabels[meal.type] || meal.type).toUpperCase(), 24, y + 1);

        // Meal name
        doc.setTextColor(...COLORS.dark);
        doc.setFontSize(9);
        doc.setFont('helvetica', 'normal');
        const name = meal.name.length > 50 ? meal.name.slice(0, 47) + '...' : meal.name;
        doc.text(name, 52, y + 1);

        // Calories
        if (meal.calories > 0) {
          doc.setTextColor(...COLORS.muted);
          doc.setFontSize(8);
          doc.text(`${meal.calories} kcal`, 190, y + 1, { align: 'right' });
        }

        y += 10;
      });
    }

    // Day separator line
    doc.setDrawColor(230, 230, 230);
    doc.setLineWidth(0.3);
    doc.line(20, y, 190, y);
    doc.setLineWidth(0.2);
    y += 6;
  });

  // Weekly summary
  if (y + 26 > 278) {
    addFooter(doc, page);
    doc.addPage();
    page++;
    y = 20;
  }

  const totalWeekCal = weekData.reduce(
    (sum, d) => sum + d.meals.reduce((s, m) => s + m.calories, 0),
    0,
  );
  const totalMeals = weekData.reduce((sum, d) => sum + d.meals.length, 0);
  const avgCal = totalMeals > 0 ? Math.round(totalWeekCal / weekData.length) : 0;

  // Summary box
  doc.setFillColor(...COLORS.primaryLight);
  doc.roundedRect(15, y, 180, 20, 2, 2, 'F');
  doc.setDrawColor(...COLORS.primary);
  doc.roundedRect(15, y, 180, 20, 2, 2, 'S');

  doc.setTextColor(...COLORS.primary);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  const summaryTitle = lang === 'fr' ? 'Resume de la semaine' : 'Weekly Summary';
  doc.text(summaryTitle, 105, y + 8, { align: 'center' });

  doc.setTextColor(...COLORS.dark);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  const mealsLabel = lang === 'fr' ? 'repas' : 'meals';
  const avgLabel = lang === 'fr' ? 'moy/jour' : 'avg/day';
  doc.text(
    `${totalMeals} ${mealsLabel}  |  ${totalWeekCal} kcal  |  ${avgCal} kcal ${avgLabel}`,
    105,
    y + 15,
    { align: 'center' },
  );

  addFooter(doc, page);

  const filename = `smartplate-planning-${new Date().toISOString().split('T')[0]}.pdf`;
  doc.save(filename);
}
