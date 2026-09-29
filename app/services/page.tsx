/**
 * ARCHITECTURE: Next.js route/page entry point.
 * Этот файл связывает URL с соответствующим UI и данными.
 * Persistence, бизнес-правила и расчётная математика находятся ниже по слоям.
 */

import{ServicesArchive}from"@/components/services-archive";import{services}from"@/lib/data";
export const metadata={title:"Услуги — Малая геодезия",description:"Каталог геодезических работ под задачу, метод и результат."};
export default function Services(){return <section className="section page-content services-page"><ServicesArchive services={services}/></section>}