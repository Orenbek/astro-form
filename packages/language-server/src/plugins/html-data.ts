import { newHTMLDataProvider, IAttributeData } from 'vscode-html-languageservice'

const fieldAttributeReference = [
  {
    name: 'AstroForm reference',
    url: 'https://TODO',
  },
]

const fieldAttributes: IAttributeData[] = [
  {
    name: 'x:basePath',
    description: '',
    references: fieldAttributeReference,
  },
  {
    name: 'x:ref',
    description: '',
    references: fieldAttributeReference,
  },
  {
    name: 'x:initialValue',
    description: '',
    references: fieldAttributeReference,
  },
  {
    name: 'x:display',
    description: '',
    references: fieldAttributeReference,
  },
  {
    name: 'x:pattern',
    description: '',
    references: fieldAttributeReference,
  },
  {
    name: 'x:visible',
    description: '',
    references: fieldAttributeReference,
  },
  {
    name: 'x:hidden',
    description: '',
    references: fieldAttributeReference,
  },
  {
    name: 'x:editable',
    description: '',
    references: fieldAttributeReference,
  },
  {
    name: 'x:readPretty',
    description: '',
    references: fieldAttributeReference,
  },
  {
    name: 'x:disabled',
    description: '',
    references: fieldAttributeReference,
  },
  {
    name: 'x:dataSource',
    description: '',
    references: fieldAttributeReference,
  },
  {
    name: 'x:validator',
    description: '',
    references: fieldAttributeReference,
  },
  {
    name: 'x:data',
    description: '',
    references: fieldAttributeReference,
  },
  {
    name: 'x:reactions',
    description: '',
    references: fieldAttributeReference,
  },
  {
    name: 'x:validateFirst',
    description: '',
    references: fieldAttributeReference,
  },
  { name: 'v:format', description: '', references: fieldAttributeReference },
  { name: 'v:required', description: '', references: fieldAttributeReference },
  { name: 'v:pattern', description: '', references: fieldAttributeReference },
  { name: 'v:max', description: '', references: fieldAttributeReference },
  { name: 'v:maximum', description: '', references: fieldAttributeReference },
  { name: 'v:maxItems', description: '', references: fieldAttributeReference },
  { name: 'v:minItems', description: '', references: fieldAttributeReference },
  { name: 'v:maxLength', description: '', references: fieldAttributeReference },
  { name: 'v:minLength', description: '', references: fieldAttributeReference },
  { name: 'v:exclusiveMaximum', description: '', references: fieldAttributeReference },
  { name: 'v:exclusiveMinimum', description: '', references: fieldAttributeReference },
  { name: 'v:minimum', description: '', references: fieldAttributeReference },
  { name: 'v:min', description: '', references: fieldAttributeReference },
  { name: 'v:len', description: '', references: fieldAttributeReference },
  { name: 'v:whitespace', description: '', references: fieldAttributeReference },
  { name: 'v:enum', description: '', references: fieldAttributeReference },
  { name: 'v:const', description: '', references: fieldAttributeReference },
  { name: 'v:multipleOf', description: '', references: fieldAttributeReference },
  { name: 'v:uniqueItems', description: '', references: fieldAttributeReference },
  { name: 'v:maxProperties', description: '', references: fieldAttributeReference },
  { name: 'v:minProperties', description: '', references: fieldAttributeReference },
]

export const astroFormElements = newHTMLDataProvider('astro-form-elements', {
  version: 1,
  tags: [
    {
      name: 'slot',
      description:
        'The slot element is a placeholder for external HTML content, allowing you to inject (or “slot”) child elements from other files into your component template.',
      references: [
        {
          name: 'AstroForm reference',
          url: 'https://TODO',
        },
      ],
      attributes: [
        {
          name: 'name',
          description:
            'The name attribute allows you to pass only HTML elements with the corresponding slot name into a slot’s location.',
          references: [
            {
              name: 'AstroForm reference',
              url: 'https://TODO',
            },
          ],
        },
      ],
    },
    {
      name: 'f.string',
      description: 'string field',
      references: [
        {
          name: 'AstroForm reference',
          url: 'https://TODO',
        },
      ],
      attributes: fieldAttributes,
    },
    {
      name: 'f.number',
      description: 'number field',
      references: [
        {
          name: 'AstroForm reference',
          url: 'https://TODO',
        },
      ],
      attributes: fieldAttributes,
    },
    {
      name: 'f.boolean',
      description: 'boolean field',
      references: [
        {
          name: 'AstroForm reference',
          url: 'https://TODO',
        },
      ],
      attributes: fieldAttributes,
    },
    {
      name: 'f.object',
      description: 'object field',
      references: [
        {
          name: 'AstroForm reference',
          url: 'https://TODO',
        },
      ],
      attributes: fieldAttributes,
    },
    {
      name: 'f.array',
      description: 'array field',
      references: [
        {
          name: 'AstroForm reference',
          url: 'https://TODO',
        },
      ],
      attributes: fieldAttributes,
    },
  ],
})
