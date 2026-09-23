import type { Config, Data, Slot } from "@puckeditor/core";
import { ArrowRight, Boxes, Crosshair, Database, ScanLine } from "lucide-react";
import { Hero } from "@/components/hero";
import { GeospatialIndex } from "@/components/geospatial-index";
import { ServiceCard } from "@/components/service-card";
import { services, cases } from "@/lib/data";

export type PuckSiteComponents = {
  HeroBlock: {
    eyebrow: string;
    title: string;
    accentTitle: string;
    lead: string;
    primaryLabel: string;
    primaryHref: string;
    secondaryLabel: string;
    secondaryHref: string;
  };
  SectionBlock: {
    eyebrow: string;
    title: string;
    theme: "light" | "dark" | "accent";
    content?: Slot;
  };
  HeadingBlock: {
    eyebrow: string;
    title: string;
    align: "left" | "center";
  };
  TextBlock: {
    text: string;
  };
  ButtonBlock: {
    label: string;
    href: string;
    style: "dark" | "light" | "ghost";
  };
  PipelineBlock: {
    title: string;
    items: Array<{ title: string; text: string }>;
  };
  ServiceGridBlock: {
    title: string;
    limit: number;
  };
  CaseGridBlock: {
    title: string;
    limit: number;
  };
  GeoIndexBlock: {
    title: string;
    description: string;
  };
  CtaBlock: {
    eyebrow: string;
    title: string;
    label: string;
    href: string;
  };
  SpacerBlock: {
    height: number;
  };
};

export type PuckSiteRootProps = {\n  pageTitle: string;\n  pageDescription: string;\n};\n\nconst config: Config<PuckSiteComponents, PuckSiteRootProps> = {
  root: {
    fields: {
      pageTitle: {
        type: "text",
        label: "Название страницы",
      },
      pageDescription: {
        type: "textarea",
        label: "Описание страницы",
      },
    },
    defaultProps: {
      pageTitle: "Малая геодезия — Puck draft",
      pageDescription: "Визуальный проектировщик сайта на Puck.",
    },
    render: ({ children, pageTitle }) => (
      <div data-puck-page-title={pageTitle}>{children}</div>
    ),
  },
  categories: {
    layout: {
      title: "Структура",
      components: ["SectionBlock", "HeadingBlock", "TextBlock", "SpacerBlock"],
    },
    content: {
      title: "Контент",
      components: ["HeroBlock", "PipelineBlock", "ServiceGridBlock", "CaseGridBlock", "GeoIndexBlock", "CtaBlock"],
    },
    actions: {
      title: "Действия",
      components: ["ButtonBlock"],
    },
  },
  components: {
    HeroBlock: {
      label: "Hero",
      fields: {
        eyebrow: { type: "text", label: "Eyebrow" },
        title: { type: "text", label: "Заголовок" },
        accentTitle: { type: "text", label: "Акцентная строка" },
        lead: { type: "textarea", label: "Описание" },
        primaryLabel: { type: "text", label: "Основная кнопка" },
        primaryHref: { type: "text", label: "Основная ссылка" },
        secondaryLabel: { type: "text", label: "Вторичная кнопка" },
        secondaryHref: { type: "text", label: "Вторичная ссылка" },
      },
      defaultProps: {
        eyebrow: "GEOSPATIAL / ENGINEERING / 2026",
        title: "Точная геодезия",
        accentTitle: "для реальных задач.",
        lead: "Съёмка, 3D, LiDAR, GNSS и готовые данные для строительства, проектирования и контроля.",
        primaryLabel: "Рассчитать стоимость",
        primaryHref: "/calculator",
        secondaryLabel: "Все услуги",
        secondaryHref: "/services",
      },
      render: (props) => <Hero {...props} />,
    },

    SectionBlock: {
      label: "Section / контейнер",
      fields: {
        eyebrow: { type: "text", label: "Eyebrow" },
        title: { type: "text", label: "Заголовок" },
        theme: {
          type: "select",
          label: "Тема",
          options: [
            { label: "Светлая", value: "light" },
            { label: "Тёмная", value: "dark" },
            { label: "Акцент", value: "accent" },
          ],
        },
        content: {
          type: "slot",
          label: "Содержимое",
        },
      },
      defaultProps: {
        eyebrow: "SECTION",
        title: "Новый раздел",
        theme: "light",
      },
      render: ({ eyebrow, title, theme, content: Content }) => (
        <section className={"section" + (theme === "dark" ? " section-dark" : theme === "accent" ? " section-accent" : "")}>
          <div className="section-heading">
            <div>
              <p className="eyebrow">{eyebrow}</p>
              <h2>{title}</h2>
            </div>
          </div>
          {Content ? <Content className="puck-section-slot" /> : null}
        </section>
      ),
    },

    HeadingBlock: {
      label: "Заголовок",
      fields: {
        eyebrow: { type: "text", label: "Eyebrow" },
        title: { type: "text", label: "Заголовок" },
        align: {
          type: "select",
          label: "Выравнивание",
          options: [
            { label: "Слева", value: "left" },
            { label: "По центру", value: "center" },
          ],
        },
      },
      defaultProps: {
        eyebrow: "BLOCK",
        title: "Редактируемый заголовок",
        align: "left",
      },
      render: ({ eyebrow, title, align }) => (
        <div className="puck-heading-block" style={{ textAlign: align }}>
          <p className="eyebrow">{eyebrow}</p>
          <h2>{title}</h2>
        </div>
      ),
    },

    TextBlock: {
      label: "Текст",
      fields: {
        text: {
          type: "textarea",
          label: "Текст",
        },
      },
      defaultProps: {
        text: "Добавьте описание блока.",
      },
      render: ({ text }) => <p className="puck-text-block">{text}</p>,
    },

    ButtonBlock: {
      label: "Кнопка",
      fields: {
        label: { type: "text", label: "Название" },
        href: { type: "text", label: "Ссылка" },
        style: {
          type: "select",
          label: "Стиль",
          options: [
            { label: "Тёмная", value: "dark" },
            { label: "Светлая", value: "light" },
            { label: "Контур", value: "ghost" },
          ],
        },
      },
      defaultProps: {
        label: "Открыть",
        href: "/calculator",
        style: "dark",
      },
      render: ({ label, href, style }) => (
        <a className={"button button-" + style} href={href}>
          {label} <ArrowRight size={17} />
        </a>
      ),
    },

    PipelineBlock: {
      label: "Pipeline",
      fields: {
        title: { type: "text", label: "Заголовок" },
        items: {
          type: "array",
          label: "Этапы",
          arrayFields: {
            title: { type: "text", label: "Название" },
            text: { type: "textarea", label: "Описание" },
          },
          getItemSummary: (item) => item.title || "Этап",
        },
      },
      defaultProps: {
        title: "От поля до готовых данных",
        items: [
          { title: "Задача", text: "Фиксируем объект и нужный результат." },
          { title: "Съёмка", text: "GNSS, RTK, тахеометр, БПЛА или LiDAR." },
          { title: "Обработка", text: "Собираем цифровую модель и проверяем качество." },
          { title: "Результат", text: "DWG, PDF, GeoTIFF, LAS/LAZ, E57, 3D." },
        ],
      },
      render: ({ title, items }) => (
        <section className="section section-dark">
          <div className="section-heading">
            <div>
              <p className="eyebrow">PIPELINE / 01—04</p>
              <h2>{title}</h2>
            </div>
          </div>
          <div className="pipeline">
            {items.map((item, index) => (
              <div className="pipeline-item" key={item.title + index}>
                <span>{"0" + (index + 1)}</span>
                {index === 0 ? <Crosshair size={27} /> : index === 1 ? <ScanLine size={27} /> : index === 2 ? <Boxes size={27} /> : <Database size={27} />}
                <h3>{item.title}</h3>
                <p>{item.text}</p>
              </div>
            ))}
          </div>
        </section>
      ),
    },

    ServiceGridBlock: {
      label: "Услуги / реальный каталог",
      fields: {
        title: { type: "text", label: "Заголовок" },
        limit: { type: "number", label: "Количество", min: 1, max: services.length },
      },
      defaultProps: {
        title: "Геодезические работы под конкретный результат",
        limit: 6,
      },
      render: ({ title, limit }) => (
        <section className="section">
          <div className="section-heading">
            <div>
              <p className="eyebrow">УСЛУГИ / {String(Math.min(limit, services.length)).padStart(2, "0")}</p>
              <h2>{title}</h2>
            </div>
          </div>
          <div className="service-grid">
            {services.slice(0, limit).map((service) => <ServiceCard service={service} key={service.slug} />)}
          </div>
        </section>
      ),
    },

    CaseGridBlock: {
      label: "Кейсы / реальный каталог",
      fields: {
        title: { type: "text", label: "Заголовок" },
        limit: { type: "number", label: "Количество", min: 1, max: cases.length },
      },
      defaultProps: {
        title: "Задача → метод → данные → результат",
        limit: 3,
      },
      render: ({ title, limit }) => (
        <section className="section">
          <div className="section-heading">
            <div>
              <p className="eyebrow">КЕЙСЫ / {String(Math.min(limit, cases.length)).padStart(2, "0")}</p>
              <h2>{title}</h2>
            </div>
          </div>
          <div className="case-grid">
            {cases.slice(0, limit).map((item) => (
              <a className="case-card" href={"/cases/" + item.slug} key={item.slug}>
                <div className={"case-art case-" + item.slug}>
                  <span>{item.category}</span>
                  <strong>{item.title}</strong>
                </div>
                <div className="case-meta">
                  <span>{item.location}</span>
                  <span>{item.area}</span>
                  <span>{item.technology}</span>
                </div>
              </a>
            ))}
          </div>
        </section>
      ),
    },

    GeoIndexBlock: {
      label: "Geospatial Index / реальный компонент",
      fields: {
        title: { type: "text", label: "Заголовок" },
        description: { type: "textarea", label: "Описание" },
      },
      defaultProps: {
        title: "Участок читается как массив пространственных данных.",
        description: "Здесь можно переключать слои и выбирать объект.",
      },
      render: ({ title, description }) => (
        <div className="puck-geo-index-wrap">
          <GeospatialIndex title={title} lead={description} />
        </div>
      ),
    },

    CtaBlock: {
      label: "CTA",
      fields: {
        eyebrow: { type: "text", label: "Eyebrow" },
        title: { type: "text", label: "Заголовок" },
        label: { type: "text", label: "Кнопка" },
        href: { type: "text", label: "Ссылка" },
      },
      defaultProps: {
        eyebrow: "Следующий шаг",
        title: "Опишите задачу. Остальное соберём в расчёт.",
        label: "Рассчитать",
        href: "/calculator",
      },
      render: ({ eyebrow, title, label, href }) => (
        <section className="section section-accent puck-cta">
          <div>
            <p className="eyebrow">{eyebrow}</p>
            <h2>{title}</h2>
          </div>
          <a className="button button-dark" href={href}>{label} <ArrowRight size={18} /></a>
        </section>
      ),
    },

    SpacerBlock: {
      label: "Отступ",
      fields: {
        height: { type: "number", label: "Высота", min: 0, max: 480 },
      },
      defaultProps: {
        height: 48,
      },
      render: ({ height }) => <div aria-hidden="true" style={{ height }} />,
    },
  },
};

export const initialPuckData: Data<PuckSiteComponents, PuckSiteRootProps> = {
  content: [
    {
      type: "HeroBlock",
      props: {
        id: "hero-home",
        eyebrow: "GEOSPATIAL / ENGINEERING / 2026",
        title: "Точная геодезия",
        accentTitle: "для реальных задач.",
        lead: "Съёмка, 3D, LiDAR, GNSS и готовые данные для строительства, проектирования и контроля.",
        primaryLabel: "Рассчитать стоимость",
        primaryHref: "/calculator",
        secondaryLabel: "Все услуги",
        secondaryHref: "/services",
      },
    },
    {
      type: "PipelineBlock",
      props: {
        id: "pipeline-home",
        title: "От поля до готовых данных",
        items: [
          { title: "Задача", text: "Фиксируем объект и нужный результат." },
          { title: "Съёмка", text: "GNSS, RTK, тахеометр, БПЛА или LiDAR." },
          { title: "Обработка", text: "Собираем цифровую модель и проверяем качество." },
          { title: "Результат", text: "DWG, PDF, GeoTIFF, LAS/LAZ, E57, 3D." },
        ],
      },
    },
    {
      type: "ServiceGridBlock",
      props: {
        id: "services-home",
        title: "Геодезические работы под конкретный результат",
        limit: Math.min(6, services.length),
      },
    },
    {
      type: "GeoIndexBlock",
      props: {
        id: "geo-index-home",
        title: "Участок читается как массив пространственных данных.",
        description: "Интерактивный индекс уже подключён к реальному компоненту geospatial-index.",
      },
    },
    {
      type: "CaseGridBlock",
      props: {
        id: "cases-home",
        title: "Задача → метод → данные → результат",
        limit: Math.min(3, cases.length),
      },
    },
    {
      type: "CtaBlock",
      props: {
        id: "cta-home",
        eyebrow: "Следующий шаг",
        title: "Опишите задачу. Остальное соберём в расчёт.",
        label: "Рассчитать",
        href: "/calculator",
      },
    },
  ],
  root: {
    props: {
      pageTitle: "Главная / Puck",
      pageDescription: "Черновик главной страницы Малая геодезия в Puck.",
    },
  },
};

export default config;
