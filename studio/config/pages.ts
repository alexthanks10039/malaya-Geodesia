import type { StudioPage } from "@/studio/types";

export const studioPages: StudioPage[] = [
  { label: "Главная", path: "/", description: "Главный экран и презентация продукта" },
  { label: "Калькулятор", path: "/calculator", description: "Основной конверсионный сценарий" },
  { label: "Услуги", path: "/services", description: "Каталог геодезических услуг" },
  { label: "Кейсы", path: "/cases", description: "Проекты и результаты" },
  { label: "Справочник", path: "/knowledge", description: "База геодезических знаний" },
  { label: "Технологии", path: "/technologies", description: "Технологии и форматы данных" },
  { label: "Партнёры", path: "/partners", description: "Партнёрский контур" },
  { label: "Контакты", path: "/contacts", description: "Контактный сценарий" },
];
