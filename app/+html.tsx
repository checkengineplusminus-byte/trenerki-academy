import React, {type PropsWithChildren} from 'react';
import {ScrollViewStyleReset, useServerDocumentContext} from 'expo-router/html';

export default function Root({children}: PropsWithChildren) {
  const {headNodes, bodyNodes, htmlAttributes, bodyAttributes} = useServerDocumentContext();
  return <html {...htmlAttributes} lang="pl">
    <head>
      <meta charSet="utf-8" />
      <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
      <meta name="viewport" content="width=device-width, initial-scale=1, shrink-to-fit=no" />
      <ScrollViewStyleReset />
      {headNodes}
    </head>
    <body {...bodyAttributes}>{children}{bodyNodes}</body>
  </html>;
}
