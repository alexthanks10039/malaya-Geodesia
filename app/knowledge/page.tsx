/**
 * ARCHITECTURE: Next.js page/layout entry point.
 * Отвечает за маршрут, получение данных и композицию UI.
 * Бизнес-логика и persistence не должны дублироваться в странице.
 */

import{getPublishedContent}from"@/lib/cms";import{KnowledgeSearch}from"@/components/knowledge-search";import type{KnowledgeItem}from"@/lib/data";export const dynamic="force-dynamic";export default async function Knowledge(){const items=await getPublishedContent("knowledge"),knowledge=items.map(item=>item.publishedData as unknown as KnowledgeItem);return <section className="section page-content"><div className="page-title"><p className="eyebrow">Knowledge Base</p><h1>Справочник геодезии</h1><p>Термины, технологии, форматы и практические материалы.</p></div><KnowledgeSearch items={knowledge}/></section>}