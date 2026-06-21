import bcrypt from "bcryptjs";
import sharp from "sharp";
import { RecordId, type Surreal } from "surrealdb";

const SEED_VERSION = 8;
const now = () => new Date().toISOString();

async function seedImage(index: number, title: string) {
  const palette = [[33,111,116], [138,162,99], [192,123,73], [63,96,130], [155,89,71], [80,132,116], [185,151,83], [92,104,142]];
  const [r, g, b] = palette[index % palette.length];
  const svg = `
    <svg width="960" height="640" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="g" x1="0" x2="1" y1="0" y2="1">
          <stop offset="0" stop-color="rgb(${r + 38},${g + 38},${b + 38})"/>
          <stop offset="1" stop-color="rgb(${Math.max(0, r - 34)},${Math.max(0, g - 28)},${Math.max(0, b - 26)})"/>
        </linearGradient>
      </defs>
      <rect width="960" height="640" fill="url(#g)"/>
      <circle cx="760" cy="150" r="210" fill="rgba(255,232,164,.22)"/>
      <circle cx="140" cy="520" r="170" fill="rgba(20,48,56,.24)"/>
      <rect x="86" y="90" width="788" height="430" rx="34" fill="rgba(255,246,216,.17)" stroke="rgba(255,246,216,.36)" stroke-width="4"/>
      <path d="M140 430 C260 360 330 470 450 390 S700 360 815 260" fill="none" stroke="rgba(255,246,216,.48)" stroke-width="18" stroke-linecap="round"/>
      <text x="110" y="172" font-size="46" font-family="Arial, sans-serif" font-weight="700" fill="rgba(255,252,232,.9)">${title.slice(0, 28)}</text>
      <text x="112" y="224" font-size="25" font-family="Arial, sans-serif" fill="rgba(255,252,232,.72)">ДМТФК · інвентарний фонд</text>
    </svg>`;
  const data = await sharp(Buffer.from(svg)).webp({ quality: 78 }).toBuffer();
  const preview = await sharp(data).resize({ width: 520, height: 346 }).webp({ quality: 72 }).toBuffer();
  return { data: new Uint8Array(data), previewData: new Uint8Array(preview), mimeType: "image/webp", size: data.length, width: 960, height: 640 };
}

async function upsertRecord(db: Surreal, table: string, id: string, value: Record<string, unknown>) {
  const recordId = new RecordId(table, id);
  if (await db.select(recordId)) {
    await db.update(recordId).merge(value);
    return false;
  }
  await db.create(recordId).content(value);
  return true;
}

async function deleteRecord(db: Surreal, table: string, id: string) {
  await db.delete(new RecordId(table, id)).catch(() => undefined);
}

const userId = (index: number) => `user:staff-${((index - 1) % staff.length) + 1}`;
const roomId = (index: number) => `room:${rooms[((index - 1) % rooms.length)].id}`;
const equipmentId = (index: number) => `equipment:equipment-${index}`;
const equipmentInstanceId = (index: number) => `equipment_instance:instance-${index}`;

const staff = [
  ["staff-1", "Прокопів Роман Васильович", "Голова циклової комісії комп’ютерних дисциплін"],
  ["staff-2", "Бойко Леся Михайлівна", "Викладачка комп’ютерних дисциплін"],
  ["staff-3", "Кожух Ірина Вікторівна", "Викладачка комп’ютерних дисциплін"],
  ["staff-4", "Мошовський Іван Іванович", "Викладач комп’ютерних дисциплін"],
  ["staff-5", "Петрицин Олексій Іванович", "Викладач комп’ютерних дисциплін"],
  ["staff-6", "Поліщук Тарас Олексійович", "Викладач комп’ютерних дисциплін"],
  ["staff-7", "Торський Петро Орестович", "Викладач комп’ютерних дисциплін"],
  ["staff-8", "Яремчук Юрій Іванович", "Викладач комп’ютерних дисциплін"],
  ["staff-9", "Баглай Ростислав Євгенович", "Викладач цифрової схемотехніки"],
  ["staff-10", "Щупляк Нестор Михайлович", "Викладач електроніки та мікроелектроніки"],
  ["staff-11", "Волянський Іван Ігорович", "Викладач комп’ютерно-інтегрованого управління"],
  ["staff-12", "Щуцька Марія Іванівна", "Викладачка метрології та технологічних процесів"],
] as const;

const userEmails: Record<string, string> = {
  admin: "stakhiv.andrii.ihorovych@gmail.com",
  "manager-1": "yatsynych.oksana.borysivna@gmail.com",
  "manager-2": "lazariv.mykhailo.mykolaiovych@gmail.com",
  "staff-1": "prokopiv.roman.vasylovych@gmail.com",
  "staff-2": "boiko.lesia.mykhailivna@gmail.com",
  "staff-3": "kozhukh.iryna.viktorivna@gmail.com",
  "staff-4": "moshovskyi.ivan.ivanovych@gmail.com",
  "staff-5": "petrytsyn.oleksii.ivanovych@gmail.com",
  "staff-6": "polishchuk.taras.oleksiiovych@gmail.com",
  "staff-7": "torskyi.petro.orestovych@gmail.com",
  "staff-8": "yaremchuk.yurii.ivanovych@gmail.com",
  "staff-9": "bahlai.rostyslav.yevhenovych@gmail.com",
  "staff-10": "shchupliak.nestor.mykhailovych@gmail.com",
  "staff-11": "volianskyi.ivan.ihorovych@gmail.com",
  "staff-12": "shchutska.mariia.ivanivna@gmail.com",
};

const rooms = [
  { id: "room-1", buildingId: "building:main", roomTypeId: "room_type:lab", responsibleId: "user:staff-1", number: "101", name: "Лабораторія програмування", floor: 1, capacity: 24, description: "Навчальна лабораторія для занять зі спеціальності F2 Інженерія програмного забезпечення." },
  { id: "room-2", buildingId: "building:main", roomTypeId: "room_type:lab", responsibleId: "user:staff-2", number: "102", name: "Лабораторія комп’ютерної графіки", floor: 1, capacity: 22, description: "Робочі місця для дизайну, комп’ютерної графіки та проєктування." },
  { id: "room-3", buildingId: "building:main", roomTypeId: "room_type:classroom", responsibleId: "user:staff-8", number: "115", name: "Навчальна аудиторія", floor: 1, capacity: 30, description: "Звичайна навчальна аудиторія для теоретичних занять." },
  { id: "room-4", buildingId: "building:lab", roomTypeId: "room_type:lab", responsibleId: "user:staff-3", number: "203", name: "Лабораторія автоматизації та робототехніки", floor: 2, capacity: 18, description: "Обладнання для автоматизації, робототехніки та мікроконтролерів." },
  { id: "room-5", buildingId: "building:lab", roomTypeId: "room_type:server", responsibleId: "user:staff-5", number: "207", name: "Серверна та мережевий вузол", floor: 2, capacity: 6, description: "Комунікаційне обладнання, сервери та резервне живлення." },
  { id: "room-6", buildingId: "building:workshop", roomTypeId: "room_type:workshop", responsibleId: "user:staff-4", number: "301", name: "Майстерня верстатів та інструментів", floor: 1, capacity: 16, description: "Виробнича зона для машинобудівних дисциплін." },
  { id: "room-7", buildingId: "building:workshop", roomTypeId: "room_type:workshop", responsibleId: "user:staff-7", number: "304", name: "Слюсарно-механічна майстерня", floor: 1, capacity: 18, description: "Інструменти, стенди та витратне обладнання для практичних занять." },
  { id: "room-8", buildingId: "building:main", roomTypeId: "room_type:library", responsibleId: "user:staff-6", number: "120", name: "Бібліотека та електронний читальний зал", floor: 1, capacity: 20, description: "Фондова зона, читальні місця та техніка для електронної бібліотеки." },
  { id: "room-9", buildingId: "building:auxiliary", roomTypeId: "room_type:storage", responsibleId: "user:staff-5", number: "С-01", name: "Склад інвентарного фонду", floor: 0, capacity: 12, description: "Тимчасове зберігання обладнання перед передачею у приміщення." },
  { id: "room-10", buildingId: "building:annex", roomTypeId: "room_type:classroom", responsibleId: "user:staff-8", number: "401", name: "Аудиторія обліку і діловодства", floor: 4, capacity: 28, description: "Навчальна аудиторія для облікових та архівних дисциплін." },
  { id: "room-11", buildingId: "building:annex", roomTypeId: "room_type:lab", responsibleId: "user:staff-2", number: "402", name: "Лабораторія офісних систем", floor: 4, capacity: 20, description: "ПК та периферія для роботи з офісними й архівними системами." },
  { id: "room-12", buildingId: "building:lab", roomTypeId: "room_type:lab", responsibleId: "user:staff-3", number: "214", name: "Лабораторія вимірювальної техніки", floor: 2, capacity: 16, description: "Вимірювальні стенди, мультиметри й навчальні комплекти." },
  { id: "room-13", buildingId: "building:main", roomTypeId: "room_type:classroom", responsibleId: "user:staff-1", number: "210", name: "Лекційна аудиторія", floor: 2, capacity: 34, description: "Аудиторія для потокових занять і презентацій." },
  { id: "room-14", buildingId: "building:auxiliary", roomTypeId: "room_type:storage", responsibleId: "user:staff-7", number: "С-02", name: "Склад майстерень", floor: 0, capacity: 10, description: "Запасні інструменти, кабелі, матеріали та витратні комплекти." },
  { id: "room-15", buildingId: "building:workshop", roomTypeId: "room_type:workshop", responsibleId: "user:staff-4", number: "307", name: "Навчальна зона ЧПК", floor: 1, capacity: 12, description: "Верстати, макети й обладнання для занять з ЧПК." },
  { id: "room-16", buildingId: "building:main", roomTypeId: "room_type:office", responsibleId: "user:admin", number: "К-01", name: "Кабінет адміністратора обліку", floor: 1, capacity: 4, description: "Робоче місце адміністратора системи обліку." },
] as const;

const equipmentNames = [
  ["Ноутбук Dell Latitude 5420", "Dell", "Latitude 5420", "category:computer"],
  ["Моноблок Lenovo ThinkCentre Neo", "Lenovo", "ThinkCentre Neo", "category:computer"],
  ["Системний блок HP ProDesk", "HP", "ProDesk 400", "category:computer"],
  ["Монітор Philips 24E1N", "Philips", "24E1N", "category:display"],
  ["Проєктор Epson EB-FH52", "Epson", "EB-FH52", "category:multimedia"],
  ["Інтерактивна панель Promethean ActivPanel", "Promethean", "ActivPanel", "category:multimedia"],
  ["3D-принтер Creality Ender-3 S1", "Creality", "Ender-3 S1", "category:lab"],
  ["Навчальний робот DOBOT Magician Lite", "Dobot", "Magician Lite", "category:robotics"],
  ["Комплект Arduino Education", "Arduino", "Education Kit", "category:robotics"],
  ["Лабораторний блок живлення YIHUA", "Yihua", "305D", "category:lab"],
  ["Осцилограф Rigol DS1054Z", "Rigol", "DS1054Z", "category:lab"],
  ["Мультиметр UNI-T UT61E+", "UNI-T", "UT61E+", "category:lab"],
  ["Комутатор Cisco Catalyst 2960", "Cisco", "Catalyst 2960", "category:network"],
  ["Маршрутизатор MikroTik hEX S", "MikroTik", "hEX S", "category:network"],
  ["Точка доступу TP-Link Omada EAP", "TP-Link", "EAP245", "category:network"],
  ["Сервер Dell PowerEdge T40", "Dell", "PowerEdge T40", "category:server"],
  ["UPS APC Back-UPS 1200VA", "APC", "BX1200MI", "category:power"],
  ["Принтер HP LaserJet Pro", "HP", "LaserJet Pro", "category:office"],
  ["БФП Canon i-SENSYS", "Canon", "i-SENSYS MF", "category:office"],
  ["Сканер Epson WorkForce", "Epson", "WorkForce DS", "category:office"],
  ["Плотер Silhouette Cameo", "Silhouette", "Cameo 4", "category:design"],
  ["Графічний планшет Wacom Intuos", "Wacom", "Intuos M", "category:design"],
  ["Фотоапарат Canon EOS 250D", "Canon", "EOS 250D", "category:media"],
  ["Мікрофон Rode NT-USB Mini", "Rode", "NT-USB Mini", "category:media"],
  ["Верстат настільний Proxxon MF 70", "Proxxon", "MF 70", "category:workshop"],
  ["Токарний навчальний верстат JET", "JET", "BD-7", "category:workshop"],
  ["Набір слюсарного інструменту Intertool", "Intertool", "ET-6001", "category:tools"],
  ["Штангенциркуль цифровий Mitutoyo", "Mitutoyo", "Absolute", "category:tools"],
  ["Комплект навчальних стендів пневматики", "Festo", "Didactic", "category:lab"],
  ["Стенд електромонтажний навчальний", "Україна", "ЕМ-Н", "category:lab"],
  ["Комплект меблів для лабораторії", "Nowy Styl", "LabDesk", "category:furniture"],
  ["Стілець лабораторний регульований", "Nowy Styl", "Lab Chair", "category:furniture"],
  ["Шафа металева інструментальна", "Ferocon", "ШМ-2", "category:furniture"],
  ["Екран моторизований 120 дюймів", "Reflecta", "CrystalLine", "category:multimedia"],
  ["Документ-камера AverVision", "AVer", "U50", "category:multimedia"],
  ["Комплект LEGO Education SPIKE", "LEGO", "SPIKE Prime", "category:robotics"],
  ["Ноутбук ASUS ExpertBook", "ASUS", "ExpertBook B1", "category:computer"],
  ["Монітор Dell P2422H", "Dell", "P2422H", "category:display"],
  ["Клавіатура Logitech K120", "Logitech", "K120", "category:peripheral"],
  ["Миша Logitech M90", "Logitech", "M90", "category:peripheral"],
  ["Вебкамера Logitech C920", "Logitech", "C920", "category:media"],
  ["Комплект кабелів HDMI/DisplayPort", "Cablexpert", "EduPack", "category:peripheral"],
  ["Лабораторний візок для обладнання", "Україна", "ВЛ-2", "category:furniture"],
  ["Набір вимірювальних щупів", "UNI-T", "Probe Kit", "category:tools"],
  ["Паяльна станція Quick 857DW+", "Quick", "857DW+", "category:tools"],
] as const;

export async function seedDatabase(db: Surreal) {
  const bootstrapId = new RecordId("app_meta", "bootstrap");
  const bootstrap = await db.select<{ version?: number }>(bootstrapId);
  if (bootstrap && Number(bootstrap.version ?? 0) >= SEED_VERSION) return { seeded: false };

  const defaultPassword = "EquipTrack2026!";
  const adminHash = await bcrypt.hash(defaultPassword, 12);
  const managerHash = await bcrypt.hash(defaultPassword, 12);
  const staffHash = await bcrypt.hash(defaultPassword, 12);
  const createdAt = now();

  await upsertRecord(db, "user", "admin", { fullName: "Стахів Андрій Ігорович", email: userEmails.admin, passwordHash: adminHash, role: "admin", status: "active", position: "Адміністратор системи EquipTrack; відповідальний за інвентарний облік", createdAt });
  await upsertRecord(db, "user", "manager-1", { fullName: "Яцинич Оксана Борисівна", email: userEmails["manager-1"], passwordHash: managerHash, role: "inventory_manager", status: "active", position: "Заступниця директора з навчальної роботи", createdAt });
  await upsertRecord(db, "user", "manager-2", { fullName: "Лазарів Михайло Миколайович", email: userEmails["manager-2"], passwordHash: managerHash, role: "inventory_manager", status: "active", position: "Завідувач відділення автоматизації та комп’ютерно-інтегрованих технологій", createdAt });
  for (const [id, fullName, position] of staff) await upsertRecord(db, "user", id, { fullName, email: userEmails[id], passwordHash: staffHash, role: "staff", status: "active", position, createdAt });

  await upsertRecord(db, "building", "main", { name: "Головний корпус ДМТФК", code: "ГК", address: "м. Дрогобич, вул. Раневицька, 12", isActive: true, createdAt });
  await upsertRecord(db, "building", "lab", { name: "Навчально-лабораторний корпус", code: "ЛК", address: "кампус ДМТФК, лабораторна зона", isActive: true, createdAt });
  await upsertRecord(db, "building", "workshop", { name: "Виробничо-механічний корпус", code: "ВК", address: "кампус ДМТФК, майстерні", isActive: true, createdAt });
  await upsertRecord(db, "building", "annex", { name: "Навчальний корпус №3", code: "К3", address: "кампус ДМТФК, навчальний блок", isActive: true, createdAt });
  await upsertRecord(db, "building", "auxiliary", { name: "Складський корпус", code: "СК", address: "кампус ДМТФК, господарська зона", isActive: true, createdAt });

  const roomTypes = [
    ["classroom", "Навчальна аудиторія"],
    ["lab", "Звичайна лабораторія"],
    ["workshop", "Майстерня"],
    ["storage", "Склад"],
    ["server", "Серверна"],
    ["library", "Бібліотека"],
    ["office", "Службовий кабінет"],
  ] as const;
  for (const [id, name] of roomTypes) await upsertRecord(db, "room_type", id, { name, slug: id, createdAt });

  const categories = [
    ["computer", "Комп’ютерна техніка"],
    ["display", "Монітори та екрани"],
    ["multimedia", "Мультимедійне обладнання"],
    ["lab", "Лабораторне обладнання"],
    ["robotics", "Робототехніка та автоматика"],
    ["network", "Мережеве обладнання"],
    ["server", "Серверне обладнання"],
    ["power", "Живлення та UPS"],
    ["office", "Офісна техніка"],
    ["design", "Дизайн і графіка"],
    ["media", "Медіаобладнання"],
    ["workshop", "Верстати й майстерні"],
    ["tools", "Інструменти"],
    ["furniture", "Меблі та оснащення"],
    ["peripheral", "Периферія"],
  ] as const;
  for (const [id, name] of categories) await upsertRecord(db, "category", id, { name, slug: id, createdAt });
  for (let index = 1; index <= 8; index += 1) await deleteRecord(db, "category", `category-${index}`);
  for (let index = 1; index <= 5; index += 1) await deleteRecord(db, "room_type", `type-${index}`);
  await db.query("DELETE file WHERE entityType = 'category'; UPDATE category SET imageFileId = NONE;");

  const suppliers = ["ТОВ Навчальні технології", "Дрогобицький центр сервісу", "ТОВ Комп’ютерний світ", "ФОП Гнатюк Орест", "Львівський постачальник освіти", "Благодійний фонд випускників ДМТФК"];
  for (const [index, name] of suppliers.entries()) await upsertRecord(db, "supplier", `supplier-${index + 1}`, { name, type: index % 2 ? "донор" : "постачальник", createdAt });
  await deleteRecord(db, "supplier", "supplier-7");
  await deleteRecord(db, "supplier", "supplier-8");

  for (const room of rooms) await upsertRecord(db, "room", room.id, { ...room, status: "active", createdAt });
  for (let index = 1; index <= 5; index += 1) {
    const room = rooms[index - 1];
    const image = await seedImage(index + 12, room.name);
    const fileId = `file:room-image-${index}`;
    await upsertRecord(db, "file", `room-image-${index}`, { ...image, name: `${room.number}-${room.name}.webp`, kind: "photo", entityType: "room", entityId: `room:${room.id}`, uploadedBy: "user:admin", createdAt });
    await db.update(new RecordId("room", room.id)).merge({ photoFileId: fileId });
  }

  await db.query("DELETE equipment_instance; DELETE movement; DELETE transfer_request; DELETE repair; DELETE audit; DELETE audit_item; DELETE writeoff_request; DELETE notification; DELETE audit_log; DELETE file WHERE entityType = 'equipment'; DELETE equipment;");

  const modelQuantity = (index: number, categoryId: string) => {
    if (index === 1) return 18;
    if (index === 4) return 24;
    if (["category:peripheral", "category:tools"].includes(categoryId)) return 14;
    if (["category:computer", "category:lab", "category:robotics"].includes(categoryId)) return 7;
    if (["category:display", "category:furniture"].includes(categoryId)) return 8;
    return index % 3 === 0 ? 4 : 3;
  };
  const instances: Array<{ index: number; id: string; modelId: string; roomId: string; responsibleId: string; condition: string; status: string; inventoryNumber: string; serialNumber: string; price: number; acquisitionDate: string }> = [];
  let instanceIndex = 1;

  for (let index = 1; index <= equipmentNames.length; index += 1) {
    const [name, manufacturer, model, categoryId] = equipmentNames[index - 1];
    const price = 3600 + index * 520;
    await upsertRecord(db, "equipment", `equipment-${index}`, {
      name,
      manufacturer,
      model,
      categoryId,
      supplierId: `supplier:supplier-${((index - 1) % suppliers.length) + 1}`,
      acquisitionDate: "2025-09-01",
      price,
      warrantyUntil: "2027-09-01",
      status: "active",
      condition: "good",
      createdAt,
      updatedAt: createdAt,
    });
    const quantity = modelQuantity(index, categoryId);
    for (let copy = 1; copy <= quantity; copy += 1) {
      const targetRoom = roomId(instanceIndex + copy + index);
      const responsibleId = userId(instanceIndex + copy);
      const condition = instanceIndex % 19 === 0 ? "damaged" : instanceIndex % 11 === 0 ? "needs_repair" : instanceIndex % 7 === 0 ? "satisfactory" : "good";
      const status = condition === "damaged" || condition === "needs_repair" ? "in_repair" : instanceIndex % 17 === 0 ? "in_storage" : "active";
      const inventoryNumber = `ДМТФК-${String(instanceIndex).padStart(5, "0")}`;
      const serialNumber = `DMTC-${new Date().getFullYear()}-${String(index).padStart(2, "0")}-${String(copy).padStart(3, "0")}`;
      const acquisitionDate = copy % 5 === 0 ? "2024-09-02" : copy % 3 === 0 ? "2025-01-15" : "2025-09-01";
      const instance = { index: instanceIndex, id: equipmentInstanceId(instanceIndex), modelId: equipmentId(index), roomId: targetRoom, responsibleId, condition, status, inventoryNumber, serialNumber, price, acquisitionDate };
      instances.push(instance);
      await upsertRecord(db, "equipment_instance", `instance-${instanceIndex}`, {
        equipmentId: instance.modelId,
        inventoryNumber,
        serialNumber,
        currentRoomId: targetRoom,
        currentResponsibleId: responsibleId,
        supplierId: `supplier:supplier-${((index - 1) % suppliers.length) + 1}`,
        acquisitionDate,
        price,
        warrantyUntil: "2027-09-01",
        status,
        condition,
        createdAt,
        updatedAt: createdAt,
      });
      await upsertRecord(db, "movement", `initial-${instanceIndex}`, { equipmentId: instance.id, movementType: "received", toRoomId: targetRoom, toResponsibleId: responsibleId, performedBy: "user:admin", acceptedBy: responsibleId, movementDate: createdAt, reason: "Поставлено на баланс ДМТФК для навчального процесу", createdAt });
      instanceIndex += 1;
    }
  }

  for (let index = 1; index <= 18; index += 1) {
    const [name] = equipmentNames[index - 1];
    const image = await seedImage(index + 22, name);
    const fileId = `file:equipment-image-${index}`;
    await upsertRecord(db, "file", `equipment-image-${index}`, { ...image, name: `${name}.webp`, kind: "photo", entityType: "equipment", entityId: equipmentId(index), uploadedBy: "user:admin", createdAt });
    await db.update(new RecordId("equipment", `equipment-${index}`)).merge({ photoFileId: fileId });
  }

  const pickInstance = (index: number) => instances[(index - 1) % instances.length];
  const transferReasons = ["Підготовка лабораторії до занять", "Тимчасове використання на практичній роботі", "Повернення після обслуговування", "Оснащення аудиторії для демонстрації"];
  for (let index = 1; index <= 54; index += 1) {
    const instance = pickInstance(index * 2);
    const eventTime = new Date(Date.now() - index * 55 * 60 * 1000).toISOString();
    const toRoom = roomId(index + 1);
    await upsertRecord(db, "movement", `transfer-${index}`, {
      equipmentId: instance.id,
      movementType: "transferred",
      fromRoomId: instance.roomId,
      toRoomId: toRoom,
      performedBy: "user:manager-1",
      movementDate: eventTime,
      reason: transferReasons[(index - 1) % transferReasons.length],
      createdAt: eventTime,
    });
  }

  for (let index = 1; index <= 48; index += 1) {
    const instance = pickInstance(index * 3);
    const requestTime = new Date(Date.now() - index * 70 * 60 * 1000).toISOString();
    const status = index % 10 === 0 ? "completed" : index % 7 === 0 ? "rejected" : index % 3 === 0 ? "approved" : "submitted";
    await upsertRecord(db, "transfer_request", `request-${index}`, {
      equipmentId: instance.id,
      requestedBy: userId(index),
      fromRoomId: instance.roomId,
      toRoomId: roomId(index + 2),
      status,
      reason: transferReasons[(index + 1) % transferReasons.length],
      createdAt: requestTime,
      updatedAt: requestTime,
      ...(status === "approved" || status === "completed" ? { approvedBy: "user:manager-1", approvedAt: new Date(new Date(requestTime).getTime() + 25 * 60 * 1000).toISOString() } : {}),
      ...(status === "rejected" ? { approvedBy: "user:manager-1", rejectedAt: new Date(new Date(requestTime).getTime() + 25 * 60 * 1000).toISOString() } : {}),
      ...(status === "completed" ? { completedBy: "user:manager-1", completedAt: new Date(new Date(requestTime).getTime() + 55 * 60 * 1000).toISOString() } : {}),
    });
  }

  const repairStatuses = ["reported", "under_review", "sent_to_repair", "repaired", "not_repairable", "cancelled"] as const;
  for (let index = 1; index <= 42; index += 1) {
    const instance = pickInstance(index * 4);
    const reportTime = new Date(Date.now() - index * 82 * 60 * 1000).toISOString();
    const status = repairStatuses[(index - 1) % repairStatuses.length];
    await upsertRecord(db, "repair", `repair-${index}`, {
      equipmentId: instance.id,
      roomId: instance.roomId,
      reportedBy: userId(index),
      issueDescription: index % 2 ? "Періодично зникає живлення під час заняття." : "Потрібна діагностика після інтенсивного використання.",
      severity: index % 5 === 0 ? "high" : index % 4 === 0 ? "low" : "medium",
      status,
      createdAt: reportTime,
      updatedAt: reportTime,
      ...(status !== "reported" ? { handledBy: "user:manager-1" } : {}),
    });
  }

  const auditStatuses = ["completed", "planned", "in_progress"] as const;
  for (let index = 1; index <= 30; index += 1) {
    const room = rooms[(index - 1) % rooms.length];
    const roomRecordId = `room:${room.id}`;
    const status = auditStatuses[(index - 1) % auditStatuses.length];
    const auditTime = new Date(Date.now() - index * 95 * 60 * 1000).toISOString();
    const roomInstances = instances.filter((entry) => entry.roomId === roomRecordId);
    const actualItemCount = roomInstances.length;
    const expectedItemCount = Math.max(0, actualItemCount + (index % 5 === 0 ? 1 : index % 7 === 0 ? -1 : 0));
    await upsertRecord(db, "audit", `audit-${index}`, {
      title: `Інвентаризація: ${room.number} · ${room.name}`,
      roomId: roomRecordId,
      plannedDate: new Date(Date.now() + index * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
      status,
      auditScope: "Звірення фактичної наявності за серійними та інвентарними номерами, місцем розташування і технічним станом.",
      expectedItemCount,
      actualItemCount: status === "completed" ? actualItemCount : 0,
      itemCountDelta: actualItemCount === expectedItemCount ? "Кількість збігається." : actualItemCount > expectedItemCount ? `Фактично на ${actualItemCount - expectedItemCount} позицій більше.` : `Фактично на ${expectedItemCount - actualItemCount} позицій менше.`,
      auditResult: status === "completed" ? "Фактичний перелік звірено із серійними номерами; розбіжності внесені до журналу." : "Перевірка очікує фактичного обходу приміщення.",
      auditNote: "Під час обходу перевірити комплектність, кабелі, маркування та відповідальну особу.",
      createdBy: "user:manager-1",
      ...(status === "completed" ? { checkedBy: "user:manager-1" } : {}),
      createdAt: auditTime,
      updatedAt: auditTime,
    });
  }
  for (const instance of instances) {
    const auditIndex = ((instance.index - 1) % 30) + 1;
    const auditStatus = auditStatuses[(auditIndex - 1) % auditStatuses.length];
    const isMisplaced = auditStatus !== "planned" && instance.index % 17 === 0;
    const isDamaged = auditStatus !== "planned" && instance.index % 23 === 0;
    const isCheckedInProgress = auditStatus === "in_progress" && instance.index % 2 === 0;
    const resultStatus = auditStatus === "completed"
      ? (isMisplaced ? "misplaced" : isDamaged ? "damaged" : "found")
      : isCheckedInProgress
        ? (isMisplaced ? "misplaced" : isDamaged ? "damaged" : "found")
        : "pending";
    await upsertRecord(db, "audit_item", `audit-item-${instance.index}`, {
      auditId: `audit:audit-${auditIndex}`,
      equipmentId: instance.id,
      expectedRoomId: instance.roomId,
      expectedSerialNumber: instance.serialNumber,
      expectedInventoryNumber: instance.inventoryNumber,
      expectedCondition: instance.condition,
      resultStatus,
      ...(resultStatus !== "pending" ? { actualRoomId: isMisplaced ? roomId(instance.index + 3) : instance.roomId, actualCondition: isDamaged ? "damaged" : instance.condition, checkedBy: "user:manager-1", checkedAt: createdAt } : {}),
      createdAt,
    });
  }

  const writeoffStatuses = ["proposed", "approved", "completed", "rejected"] as const;
  for (let index = 1; index <= 36; index += 1) {
    const instance = pickInstance(index * 5);
    const status = writeoffStatuses[(index - 1) % writeoffStatuses.length];
    const writeoffTime = new Date(Date.now() - index * 110 * 60 * 1000).toISOString();
    await upsertRecord(db, "writeoff_request", `writeoff-${index}`, {
      equipmentId: instance.id,
      reason: index % 2 ? "Фізичний знос після тривалого використання в майстерні." : "Нерентабельний ремонт та відсутність запчастин.",
      status,
      proposedBy: "user:manager-1",
      createdAt: writeoffTime,
      ...(status === "approved" || status === "completed" ? { approvedBy: "user:admin", completedAt: new Date(new Date(writeoffTime).getTime() + 40 * 60 * 1000).toISOString() } : {}),
      ...(status === "rejected" ? { rejectedBy: "user:admin", rejectedAt: new Date(new Date(writeoffTime).getTime() + 40 * 60 * 1000).toISOString() } : {}),
    });
  }

  const notificationTypes = ["equipment_assigned", "transfer_request", "system"] as const;
  for (let index = 1; index <= 64; index += 1) {
    const notificationTime = new Date(Date.now() - index * 35 * 60 * 1000).toISOString();
    const type = notificationTypes[(index - 1) % notificationTypes.length];
    const isRead = index % 3 === 0;
    await upsertRecord(db, "notification", `notification-${index}`, {
      userId: userId(index),
      type,
      title: type === "transfer_request" ? "Оновлено заявку на передачу" : type === "system" ? "Службове нагадування" : "Оновлено перелік обладнання",
      body: type === "transfer_request" ? "Перевірте стан заявки та фактичне переміщення обладнання." : type === "system" ? "Потрібно актуалізувати відповідального за приміщення." : `Перевірте актуальний склад обладнання у приміщенні ${rooms[(index - 1) % rooms.length].number}.`,
      isRead,
      createdAt: notificationTime,
      ...(isRead ? { readAt: new Date(new Date(notificationTime).getTime() + 12 * 60 * 1000).toISOString() } : {}),
    });
  }
  for (let index = 1; index <= 80; index += 1) {
    const instance = pickInstance(index);
    await upsertRecord(db, "audit_log", `log-${index}`, { actorId: index % 2 ? "user:manager-1" : "user:admin", action: index % 2 ? "equipment_instance.updated" : "audit.completed", entityType: index % 2 ? "equipment_instance" : "audit", entityId: index % 2 ? instance.id : `audit:audit-${((index - 1) % 30) + 1}`, createdAt: new Date(Date.now() - index * 22 * 60 * 1000).toISOString() });
  }

  if (bootstrap) await db.update(bootstrapId).merge({ version: SEED_VERSION, completedAt: now() });
  else await db.create(bootstrapId).content({ version: SEED_VERSION, completedAt: now() });
  return { seeded: true };
}
