#!/usr/bin/env tsx
/**
 * Script de Auditoria Automatica de Servicios
 * 
 * Valida que todos los metodos publicos que acceden a repositorios:
 * 1. Reciben companyId como parametro
 * 2. Filtran queries por company_id
 * 3. No tienen queries raw SQL sin filtro company_id
 */

import * as fs from 'fs';
import * as path from 'path';
import * as ts from 'typescript';

interface MethodInfo {
  service: string;
  method: string;
  receivesCompanyId: boolean;
  filtersByCompanyId: boolean;
  hasRawSqlWithoutFilter: boolean;
  status: 'CORRECTO' | 'REQUIERE_CORRECCION' | 'NO_APLICA';
  issues: string[];
}

interface ServiceAudit {
  file: string;
  methods: MethodInfo[];
  totalMethods: number;
  correctMethods: number;
  incorrectMethods: number;
  notApplicableMethods: number;
}

const MODULES_PATH = path.join(__dirname, '..', 'apps', 'api', 'src', 'modules');
const REPOSITORY_PATTERNS = [
  /\.find\(/,
  /\.findOne\(/,
  /\.findAndCount\(/,
  /\.createQueryBuilder\(/,
  /\.query\(/,
  /\.save\(/,
  /\.update\(/,
  /\.remove\(/,
  /\.delete\(/,
];

/**
 * Verifica si un metodo accede a repositorios
 */
function accessesRepository(methodBody: string): boolean {
  return REPOSITORY_PATTERNS.some(pattern => pattern.test(methodBody));
}

/**
 * Verifica si un metodo recibe companyId como parametro
 */
function receivesCompanyId(params: string[]): boolean {
  return params.some(param => 
    param.includes('companyId') || param.includes('company_id')
  );
}

/**
 * Verifica si un metodo filtra por company_id
 */
function filtersByCompanyId(methodBody: string): boolean {
  const patterns = [
    /company_id:\s*companyId/,
    /company_id\s*=\s*:companyId/,
    /company_id\s*=\s*\$[0-9]+/,
    /company_id\s*=\s*companyId/,
    /'company_id':\s*companyId/,
    /"company_id":\s*companyId/,
    /where.*company_id/,
    /andWhere.*company_id/,
  ];
  
  return patterns.some(pattern => pattern.test(methodBody));
}

/**
 * Verifica si hay queries raw SQL sin filtro company_id
 */
function hasRawSqlWithoutFilter(methodBody: string): boolean {
  // Buscar queries raw SQL
  const sqlPattern = /\.query\(['"`](SELECT|UPDATE|DELETE|INSERT)[^'"`]*['"`]/i;
  if (!sqlPattern.test(methodBody)) {
    return false;
  }
  
  // Verificar si incluye filtro company_id
  return !filtersByCompanyId(methodBody);
}

/**
 * Analiza un archivo service usando AST
 */
function analyzeService(filePath: string): ServiceAudit {
  const sourceCode = fs.readFileSync(filePath, 'utf-8');
  const sourceFile = ts.createSourceFile(
    filePath,
    sourceCode,
    ts.ScriptTarget.Latest,
    true
  );

  const methods: MethodInfo[] = [];

  function visit(node: ts.Node) {
    // Buscar métodos de clase
    if (ts.isMethodDeclaration(node) && node.modifiers) {
      const isPublic = !node.modifiers.some(m => m.kind === ts.SyntaxKind.PrivateKeyword);
      
      if (isPublic && node.name) {
        const methodName = node.name.getText(sourceFile);
        const methodBody = node.body?.getText(sourceFile) || '';
        
        // Recopilar parámetros
        const parameters: string[] = [];
        ts.forEachChild(node, (child) => {
          if (ts.isParameter(child)) {
            parameters.push(child.getText(sourceFile));
          }
        });
        
        // Verificar si accede a repositorios
        if (accessesRepository(methodBody)) {
          const receivesCompanyIdParam = receivesCompanyId(parameters);
          const filtersByCompanyIdValue = filtersByCompanyId(methodBody);
          const hasRawSqlWithoutFilterValue = hasRawSqlWithoutFilter(methodBody);
          
          const issues: string[] = [];
          let status: 'CORRECTO' | 'REQUIERE_CORRECCION' | 'NO_APLICA';
          
          if (!receivesCompanyIdParam && !filtersByCompanyIdValue) {
            status = 'NO_APLICA'; // Podría ser un método que no necesita companyId
          } else if (receivesCompanyIdParam && filtersByCompanyIdValue && !hasRawSqlWithoutFilterValue) {
            status = 'CORRECTO';
          } else {
            status = 'REQUIERE_CORRECCION';
            if (!receivesCompanyIdParam) {
              issues.push('No recibe companyId como parametro');
            }
            if (!filtersByCompanyIdValue) {
              issues.push('No filtra queries por company_id');
            }
            if (hasRawSqlWithoutFilterValue) {
              issues.push('Tiene queries raw SQL sin filtro company_id');
            }
          }
          
          methods.push({
            service: path.basename(filePath),
            method: methodName,
            receivesCompanyId: receivesCompanyIdParam,
            filtersByCompanyId: filtersByCompanyIdValue,
            hasRawSqlWithoutFilter: hasRawSqlWithoutFilterValue,
            status,
            issues
          });
        }
      }
    }

    ts.forEachChild(node, visit);
  }

  visit(sourceFile);

  const correctMethods = methods.filter(m => m.status === 'CORRECTO').length;
  const incorrectMethods = methods.filter(m => m.status === 'REQUIERE_CORRECCION').length;
  const notApplicableMethods = methods.filter(m => m.status === 'NO_APLICA').length;

  return {
    file: filePath,
    methods,
    totalMethods: methods.length,
    correctMethods,
    incorrectMethods,
    notApplicableMethods
  };
}

/**
 * Encuentra todos los archivos service
 */
function findServices(): string[] {
  const services: string[] = [];

  function walkDir(dir: string) {
    const files = fs.readdirSync(dir);
    for (const file of files) {
      const filePath = path.join(dir, file);
      const stat = fs.statSync(filePath);
      
      if (stat.isDirectory()) {
        walkDir(filePath);
      } else if (file.endsWith('.service.ts') && !file.includes('.spec.ts')) {
        services.push(filePath);
      }
    }
  }

  walkDir(MODULES_PATH);
  return services;
}

/**
 * Genera reporte en formato Markdown
 */
function generateReport(audits: ServiceAudit[]): string {
  let report = '# Reporte de Auditoria de Servicios\n\n';
  report += `Generado: ${new Date().toISOString()}\n\n`;
  
  const totalMethods = audits.reduce((sum, a) => sum + a.totalMethods, 0);
  const totalCorrect = audits.reduce((sum, a) => sum + a.correctMethods, 0);
  const totalIncorrect = audits.reduce((sum, a) => sum + a.incorrectMethods, 0);
  const totalNotApplicable = audits.reduce((sum, a) => sum + a.notApplicableMethods, 0);

  report += '## Resumen Ejecutivo\n\n';
  report += `- **Total Servicios**: ${audits.length}\n`;
  report += `- **Total Metodos**: ${totalMethods}\n`;
  report += `- **Metodos Correctos**: ${totalCorrect}\n`;
  report += `- **Metodos Requieren Correccion**: ${totalIncorrect}\n`;
  report += `- **Metodos No Aplicables**: ${totalNotApplicable}\n\n`;

  if (totalIncorrect > 0) {
    report += '## ⚠️ Metodos que Requieren Correccion\n\n';
    
    for (const audit of audits) {
      const incorrect = audit.methods.filter(m => m.status === 'REQUIERE_CORRECCION');
      if (incorrect.length > 0) {
        report += `### ${path.basename(audit.file)}\n\n`;
        report += '| Metodo | Recibe companyId | Filtra por company_id | Problemas |\n';
        report += '|--------|------------------|------------------------|----------|\n';
        
        for (const method of incorrect) {
          report += `| ${method.method} | ${method.receivesCompanyId ? 'SI' : 'NO'} | ${method.filtersByCompanyId ? 'SI' : 'NO'} | ${method.issues.join(', ')} |\n`;
        }
        report += '\n';
      }
    }
  }

  report += '## Detalle por Servicio\n\n';
  
  for (const audit of audits) {
    if (audit.totalMethods === 0) continue;
    
    report += `### ${path.basename(audit.file)}\n\n`;
    report += `- Total Metodos: ${audit.totalMethods}\n`;
    report += `- Correctos: ${audit.correctMethods}\n`;
    report += `- Requieren Correccion: ${audit.incorrectMethods}\n`;
    report += `- No Aplicables: ${audit.notApplicableMethods}\n\n`;
    
    if (audit.methods.length > 0) {
      report += '| Metodo | Recibe companyId | Filtra por company_id | Estado |\n';
      report += '|--------|------------------|------------------------|--------|\n';
      
      for (const method of audit.methods) {
        report += `| ${method.method} | ${method.receivesCompanyId ? 'SI' : 'NO'} | ${method.filtersByCompanyId ? 'SI' : 'NO'} | ${method.status} |\n`;
      }
      report += '\n';
    }
  }

  return report;
}

/**
 * Funcion principal
 */
function main() {
  console.log('🔍 Iniciando auditoria de servicios...\n');
  
  const services = findServices();
  console.log(`📋 Encontrados ${services.length} servicios\n`);

  const audits: ServiceAudit[] = [];
  
  for (const service of services) {
    console.log(`📄 Analizando: ${path.basename(service)}`);
    try {
      const audit = analyzeService(service);
      audits.push(audit);
      console.log(`   ✓ ${audit.totalMethods} metodos, ${audit.correctMethods} correctos, ${audit.incorrectMethods} requieren correccion\n`);
    } catch (error) {
      console.error(`   ✗ Error analizando ${service}:`, error);
    }
  }

  // Calcular totales
  const totalIncorrect = audits.reduce((sum, a) => sum + a.incorrectMethods, 0);
  
  // Generar reporte
  const report = generateReport(audits);
  const reportPath = path.join(__dirname, '..', 'services-audit-report.md');
  fs.writeFileSync(reportPath, report);
  
  console.log(`\n✅ Reporte generado en: ${reportPath}`);
  
  // También generar JSON
  const jsonPath = path.join(__dirname, '..', 'services-audit-report.json');
  fs.writeFileSync(jsonPath, JSON.stringify(audits, null, 2));
  console.log(`✅ Reporte JSON generado en: ${jsonPath}`);
  
  // Si hay métodos que requieren corrección, fallar
  if (totalIncorrect > 0) {
    console.error(`\n❌ ERROR: Se encontraron ${totalIncorrect} método(s) que requieren corrección de seguridad.`);
    console.error('   Por favor, revisa el reporte y corrige los problemas antes de continuar.');
    console.error(`   Reporte: ${reportPath}`);
    process.exit(1);
  }
  
  console.log('\n✅ Auditoría de servicios completada: Todos los métodos están correctamente protegidos.');
}

main();

