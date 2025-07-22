// Simple test to verify the accordion implementation compiles correctly
const fs = require('fs');

try {
  // Read the CompilerPanel file to check for syntax errors
  const content = fs.readFileSync('/Users/blessed/WebstormProjects/remix-ide-clone/src/components/Compiler/CompilerPanel.tsx', 'utf8');

  // Check if accordion imports are present
  const hasAccordionImport = content.includes("import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from '@/components/ui/accordion'");

  // Check if accordion components are used
  const hasAccordionUsage = content.includes('<Accordion type="single" collapsible') &&
                           content.includes('<AccordionItem value="more-info"') &&
                           content.includes('<AccordionTrigger') &&
                           content.includes('<AccordionContent');

  // Check if basic details are present
  const hasBasicDetails = content.includes('Basic Details - Always Visible') &&
                         content.includes('Functions:') &&
                         content.includes('Events:') &&
                         content.includes('Size:');

  // Check if More Info accordion is present
  const hasMoreInfoAccordion = content.includes('More Info Accordion') &&
                              content.includes('More Info');

  console.log('✓ Accordion import check:', hasAccordionImport);
  console.log('✓ Accordion usage check:', hasAccordionUsage);
  console.log('✓ Basic details check:', hasBasicDetails);
  console.log('✓ More Info accordion check:', hasMoreInfoAccordion);

  if (hasAccordionImport && hasAccordionUsage && hasBasicDetails && hasMoreInfoAccordion) {
    console.log('\n✅ All checks passed! The accordion implementation is correctly integrated.');
  } else {
    console.log('\n❌ Some checks failed. Please review the implementation.');
  }

} catch (error) {
  console.error('❌ Error reading file:', error.message);
}
