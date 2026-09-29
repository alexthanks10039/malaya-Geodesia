/**
 * ARCHITECTURE: Next.js route/page.
 * Этот файл является entry point конкретного URL и отвечает за композицию страницы.
 * Данные и бизнес-логика приходят из components/ и lib/; страница не является source of truth.
 */

import {Calculator} from "@/components/calculator"; export default function CalculatorPage(){return <section className="section page-content"><div className="page-title"><p className="eyebrow">Конфигуратор</p><h1>Рассчитать геодезические работы</h1><p>Соберите предварительный состав работ за несколько шагов.</p></div><Calculator/></section>}