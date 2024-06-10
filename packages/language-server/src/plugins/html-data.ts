import { getDefaultHTMLDataProvider, newHTMLDataProvider, IAttributeData } from 'vscode-html-languageservice'

const fieldAttributes: IAttributeData[] = [
  {
    name: 'name',
    description: '',
    references: [],
  },
  {
    name: 'as',
    description: '',
    references: [],
  },
  {
    name: 'x:ref',
    description: '',
    references: [],
  },
  {
    name: 'x:initialValue',
    description: '',
    references: [],
  },
  {
    name: 'x:display',
    description: '',
    references: [],
  },
  {
    name: 'x:visible',
    description: '',
    references: [],
  },
  {
    name: 'x:hidden',
    description: '',
    references: [],
  },
  {
    name: 'x:pattern',
    description: '',
    references: [],
  },
  {
    name: 'x:editable',
    description: '',
    references: [],
  },
  {
    name: 'x:readPretty',
    description: '',
    references: [],
  },
  {
    name: 'x:disabled',
    description: '',
    references: [],
  },
  {
    name: 'x:dataSource',
    description: '',
    references: [],
  },
  {
    name: 'x:validator',
    description: '',
    references: [],
  },
  {
    name: 'x:data',
    description: '',
    references: [],
  },
  {
    name: 'x:reactions',
    description: '',
    references: [],
  },
  {
    name: 'x:validateFirst',
    description: '',
    references: [],
  },
]

export const classListAttribute = newHTMLDataProvider('class-list', {
  version: 1,
  globalAttributes: [
    {
      name: 'class:list',
      description:
        'Utility to provide a list of classes of the element. Takes an array of class values and converts them into a class string.',
      references: [
        {
          name: 'Astro reference',
          url: 'https://docs.astro.build/en/reference/directives-reference/#classlist',
        },
      ],
    },
  ],
})

export const astroFormElements = newHTMLDataProvider('astro-form-elements', {
  version: 1,
  tags: [
    {
      name: 'slot',
      description:
        'The slot element is a placeholder for external HTML content, allowing you to inject (or “slot”) child elements from other files into your component template.',
      references: [
        {
          name: 'Astro reference',
          url: 'https://docs.astro.build/en/core-concepts/astro-components/#slots',
        },
      ],
      attributes: [
        {
          name: 'name',
          description:
            'The name attribute allows you to pass only HTML elements with the corresponding slot name into a slot’s location.',
          references: [
            {
              name: 'Astro reference',
              url: 'https://docs.astro.build/en/core-concepts/astro-components/#named-slots',
            },
          ],
        },
      ],
    },
    {
      name: 'f.string',
      description: '',
      references: [],
      attributes: fieldAttributes,
    },
    {
      name: 'f.number',
      description: '',
      references: [],
      attributes: fieldAttributes,
    },
    {
      name: 'f.boolean',
      description: '',
      references: [],
      attributes: fieldAttributes,
    },
    {
      name: 'f.object',
      description: '',
      references: [],
      attributes: fieldAttributes,
    },
    {
      name: 'f.array',
      description: '',
      references: [],
      attributes: fieldAttributes,
    },
  ],
})
