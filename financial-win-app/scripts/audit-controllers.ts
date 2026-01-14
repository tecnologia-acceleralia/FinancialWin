#!/usr/bin/env tsx
/**
 * Script de Auditoria Automatica de Controllers
 * 
 * Valida que todos los endpoints tenant-scoped tienen @CompanyId() decorator
 * y pasan companyId al servicio correspondiente.
 */

import * as fs from 'fs';
import * as path from 'path';
import * as ts from 'typescript';

interface EndpointInfo {
  controller: string;
  method: string;
  route: string;
  decorator: string;
  hasCompanyId: boolean;
  passesCompanyId: boolean;
  tenantScoped: boolean;
  status: 'CORRECTO' | 'REQUIERE_CORRECCION' | 'NO_APLICA';
  issues: string[];
}

interface ControllerAudit {
  file: string;
  endpoints: EndpointInfo[];
  totalEndpoints: number;
  correctEndpoints: number;
  incorrectEndpoints: number;
  notApplicableEndpoints: number;
}

const MODULES_PATH = path.join(__dirname, '..', 'apps', 'api', 'src', 'modules');
const TENANT_SCOPED_ENTITIES = [
  'project', 'document', 'workspace', 'thread', 'assistant', 
  'evaluation', 'rule', 'criteria', 'history', 'financial-win'
];

/**
 * Verifica si un endpoint accede a datos tenant-scoped
 */
function isTenantScoped(serviceMethod: string, params: string[]): boolean {
  const methodLower = serviceMethod.toLowerCase();
  const paramsLower = params.map(p => p.toLowerCase()).join(' ');
  
  // Verificar si el método accede a entidades tenant-scoped
  for (const entity of TENANT_SCOPED_ENTITIES) {
    if (methodLower.includes(entity) || paramsLower.includes(entity)) {
      return true;
    }
  }
  
  // Verificar si recibe IDs de recursos tenant-scoped
  const tenantScopedIds = ['projectid', 'documentid', 'threadid', 'assistantid', 'evaluationid', 'ruleid'];
  for (const id of tenantScopedIds) {
    if (paramsLower.includes(id)) {
      return true;
    }
  }
  
  return false;
}

/**
 * Analiza un archivo controller usando AST
 */
function analyzeController(filePath: string): ControllerAudit {
  const sourceCode = fs.readFileSync(filePath, 'utf-8');
  const sourceFile = ts.createSourceFile(
    filePath,
    sourceCode,
    ts.ScriptTarget.Latest,
    true
  );

  const endpoints: EndpointInfo[] = [];
  let currentMethod: any = null;

  function visit(node: ts.Node) {
    // Buscar métodos de clase
    if (ts.isMethodDeclaration(node)) {
      currentMethod = {
        name: node.name?.getText(sourceFile),
        decorators: [],
        parameters: [],
        body: node.body?.getText(sourceFile) || ''
      };

      // Recopilar decoradores
      ts.forEachChild(node, (child) => {
        if (ts.isDecorator(child)) {
          const decoratorText = child.getText(sourceFile);
          currentMethod.decorators.push(decoratorText);
        }
        if (ts.isParameter(child)) {
          const paramText = child.getText(sourceFile);
          currentMethod.parameters.push(paramText);
        }
      });

      // Buscar decoradores HTTP
      const httpDecorators = ['@Get', '@Post', '@Put', '@Patch', '@Delete'];
      const hasHttpDecorator = currentMethod.decorators.some((d: string) =>
        httpDecorators.some(http => d.includes(http))
      );

      if (hasHttpDecorator) {
        const httpDecorator = currentMethod.decorators.find((d: string) =>
          httpDecorators.some(http => d.includes(http))
        );
        const methodType = httpDecorator.match(/@(Get|Post|Put|Patch|Delete)/)?.[1] || 'Unknown';
        
        const hasCompanyId = currentMethod.parameters.some((p: string) =>
          p.includes('@CompanyId()') || p.includes('companyId')
        );
        
        const passesCompanyId = currentMethod.body.includes('companyId');
        
        // Determinar si es tenant-scoped (análisis básico)
        const tenantScoped = isTenantScoped(
          currentMethod.body,
          currentMethod.parameters
        );

        const issues: string[] = [];
        let status: 'CORRECTO' | 'REQUIERE_CORRECCION' | 'NO_APLICA';

        if (!tenantScoped) {
          status = 'NO_APLICA';
        } else if (hasCompanyId && passesCompanyId) {
          status = 'CORRECTO';
        } else {
          status = 'REQUIERE_CORRECCION';
          if (!hasCompanyId) {
            issues.push('Falta @CompanyId() decorator');
          }
          if (!passesCompanyId) {
            issues.push('No pasa companyId al servicio');
          }
        }

        endpoints.push({
          controller: path.basename(filePath),
          method: methodType,
          route: httpDecorator.match(/\(['"](.*?)['"]\)/)?.[1] || '/',
          decorator: httpDecorator,
          hasCompanyId,
          passesCompanyId,
          tenantScoped,
          status,
          issues
        });
      }

      currentMethod = null;
    }

    ts.forEachChild(node, visit);
  }

  visit(sourceFile);

  const correctEndpoints = endpoints.filter(e => e.status === 'CORRECTO').length;
  const incorrectEndpoints = endpoints.filter(e => e.status === 'REQUIERE_CORRECCION').length;
  const notApplicableEndpoints = endpoints.filter(e => e.status === 'NO_APLICA').length;

  return {
    file: filePath,
    endpoints,
    totalEndpoints: endpoints.length,
    correctEndpoints,
    incorrectEndpoints,
    notApplicableEndpoints
  };
}

/**
 * Encuentra todos los archivos controller
 */
function findControllers(): string[] {
  const controllers: string[] = [];

  function walkDir(dir: string) {
    const files = fs.readdirSync(dir);
    for (const file of files) {
      const filePath = path.join(dir, file);
      const stat = fs.statSync(filePath);
      
      if (stat.isDirectory()) {
        walkDir(filePath);
      } else if (file.endsWith('.controller.ts')) {
        controllers.push(filePath);
      }
    }
  }

  walkDir(MODULES_PATH);
  return controllers;
}

/**
 * Genera reporte en formato Markdown
 */
function generateReport(audits: ControllerAudit[]): string {
  let report = '# Reporte de Auditoria de Controllers\n\n';
  report += `Generado: ${new Date().toISOString()}\n\n`;
  
  const totalEndpoints = audits.reduce((sum, a) => sum + a.totalEndpoints, 0);
  const totalCorrect = audits.reduce((sum, a) => sum + a.correctEndpoints, 0);
  const totalIncorrect = audits.reduce((sum, a) => sum + a.incorrectEndpoints, 0);
  const totalNotApplicable = audits.reduce((sum, a) => sum + a.notApplicableEndpoints, 0);

  report += '## Resumen Ejecutivo\n\n';
  report += `- **Total Controllers**: ${audits.length}\n`;
  report += `- **Total Endpoints**: ${totalEndpoints}\n`;
  report += `- **Endpoints Correctos**: ${totalCorrect}\n`;
  report += `- **Endpoints Requieren Correccion**: ${totalIncorrect}\n`;
  report += `- **Endpoints No Aplicables**: ${totalNotApplicable}\n\n`;

  if (totalIncorrect > 0) {
    report += '## ⚠️ Endpoints que Requieren Correccion\n\n';
    
    for (const audit of audits) {
      const incorrect = audit.endpoints.filter(e => e.status === 'REQUIERE_CORRECCION');
      if (incorrect.length > 0) {
        report += `### ${path.basename(audit.file)}\n\n`;
        report += '| Metodo | Ruta | Problemas |\n';
        report += '|--------|------|----------|\n';
        
        for (const endpoint of incorrect) {
          report += `| ${endpoint.method} | ${endpoint.route} | ${endpoint.issues.join(', ')} |\n`;
        }
        report += '\n';
      }
    }
  }

  report += '## Detalle por Controller\n\n';
  
  for (const audit of audits) {
    report += `### ${path.basename(audit.file)}\n\n`;
    report += `- Total Endpoints: ${audit.totalEndpoints}\n`;
    report += `- Correctos: ${audit.correctEndpoints}\n`;
    report += `- Requieren Correccion: ${audit.incorrectEndpoints}\n`;
    report += `- No Aplicables: ${audit.notApplicableEndpoints}\n\n`;
    
    if (audit.endpoints.length > 0) {
      report += '| Metodo | Ruta | Tenant-Scoped | @CompanyId() | Pasa companyId | Estado |\n';
      report += '|--------|------|---------------|--------------|----------------|--------|\n';
      
      for (const endpoint of audit.endpoints) {
        report += `| ${endpoint.method} | ${endpoint.route} | ${endpoint.tenantScoped ? 'SI' : 'NO'} | ${endpoint.hasCompanyId ? 'SI' : 'NO'} | ${endpoint.passesCompanyId ? 'SI' : 'NO'} | ${endpoint.status} |\n`;
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
  console.log('🔍 Iniciando auditoria de controllers...\n');
  
  const controllers = findControllers();
  console.log(`📋 Encontrados ${controllers.length} controllers\n`);

  const audits: ControllerAudit[] = [];
  
  for (const controller of controllers) {
    console.log(`📄 Analizando: ${path.basename(controller)}`);
    try {
      const audit = analyzeController(controller);
      audits.push(audit);
      console.log(`   ✓ ${audit.totalEndpoints} endpoints, ${audit.correctEndpoints} correctos, ${audit.incorrectEndpoints} requieren correccion\n`);
    } catch (error) {
      console.error(`   ✗ Error analizando ${controller}:`, error);
    }
  }

  // Calcular totales
  const totalIncorrect = audits.reduce((sum, a) => sum + a.incorrectEndpoints, 0);
  
  // Generar reporte
  const report = generateReport(audits);
  const reportPath = path.join(__dirname, '..', 'security-audit-report.md');
  fs.writeFileSync(reportPath, report);
  
  console.log(`\n✅ Reporte generado en: ${reportPath}`);
  
  // También generar JSON
  const jsonPath = path.join(__dirname, '..', 'security-audit-report.json');
  fs.writeFileSync(jsonPath, JSON.stringify(audits, null, 2));
  console.log(`✅ Reporte JSON generado en: ${jsonPath}`);
  
  // Si hay endpoints que requieren corrección, fallar
  if (totalIncorrect > 0) {
    console.error(`\n❌ ERROR: Se encontraron ${totalIncorrect} endpoint(s) que requieren corrección de seguridad.`);
    console.error('   Por favor, revisa el reporte y corrige los problemas antes de continuar.');
    console.error(`   Reporte: ${reportPath}`);
    process.exit(1);
  }
  
  console.log('\n✅ Auditoría de controllers completada: Todos los endpoints están correctamente protegidos.');
}

main();

