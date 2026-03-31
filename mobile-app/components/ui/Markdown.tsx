import React from 'react';
import { View, Text, StyleSheet, ScrollView, Linking } from 'react-native';

interface MarkdownProps {
  content: string;
  style?: any;
}

// Simple markdown parser for mobile - handles basic formatting
export function Markdown({ content, style }: MarkdownProps) {
  if (!content) return null;

  const lines = content.split('\n');
  const elements: React.ReactNode[] = [];
  let listItems: string[] = [];
  let codeBlock: string[] = [];
  let inCodeBlock = false;

  const flushList = () => {
    if (listItems.length > 0) {
      elements.push(
        <View key={`list-${elements.length}`} style={styles.list}>
          {listItems.map((item, i) => (
            <View key={i} style={styles.listItem}>
              <Text style={styles.bullet}>•</Text>
              <Text style={styles.listText}>{parseInline(item)}</Text>
            </View>
          ))}
        </View>
      );
      listItems = [];
    }
  };

  const flushCodeBlock = () => {
    if (codeBlock.length > 0) {
      elements.push(
        <View key={`code-${elements.length}`} style={styles.codeBlock}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <Text style={styles.codeText}>{codeBlock.join('\n')}</Text>
          </ScrollView>
        </View>
      );
      codeBlock = [];
    }
  };

  const parseInline = (text: string): React.ReactNode => {
    // Handle bold **text**
    const parts = text.split(/(\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`|\[[^\]]+\]\([^)]+\))/g);
    
    return parts.map((part, i) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return <Text key={i} style={styles.bold}>{part.slice(2, -2)}</Text>;
      }
      if (part.startsWith('*') && part.endsWith('*')) {
        return <Text key={i} style={styles.italic}>{part.slice(1, -1)}</Text>;
      }
      if (part.startsWith('`') && part.endsWith('`')) {
        return <Text key={i} style={styles.inlineCode}>{part.slice(1, -1)}</Text>;
      }
      // Handle links [text](url)
      const linkMatch = part.match(/\[([^\]]+)\]\(([^)]+)\)/);
      if (linkMatch) {
        return (
          <Text 
            key={i} 
            style={styles.link}
            onPress={() => Linking.openURL(linkMatch[2])}
          >
            {linkMatch[1]}
          </Text>
        );
      }
      return part;
    });
  };

  lines.forEach((line, index) => {
    const trimmed = line.trim();

    // Code block toggle
    if (trimmed.startsWith('```')) {
      if (inCodeBlock) {
        flushCodeBlock();
        inCodeBlock = false;
      } else {
        flushList();
        inCodeBlock = true;
      }
      return;
    }

    if (inCodeBlock) {
      codeBlock.push(line);
      return;
    }

    // Empty line
    if (!trimmed) {
      flushList();
      elements.push(<View key={`space-${index}`} style={{ height: 8 }} />);
      return;
    }

    // Headers
    if (trimmed.startsWith('### ')) {
      flushList();
      elements.push(
        <Text key={index} style={styles.h3}>{parseInline(trimmed.slice(4))}</Text>
      );
      return;
    }
    if (trimmed.startsWith('## ')) {
      flushList();
      elements.push(
        <Text key={index} style={styles.h2}>{parseInline(trimmed.slice(3))}</Text>
      );
      return;
    }
    if (trimmed.startsWith('# ')) {
      flushList();
      elements.push(
        <Text key={index} style={styles.h1}>{parseInline(trimmed.slice(2))}</Text>
      );
      return;
    }

    // List items
    if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
      listItems.push(trimmed.slice(2));
      return;
    }
    if (/^\d+\.\s/.test(trimmed)) {
      listItems.push(trimmed.replace(/^\d+\.\s/, ''));
      return;
    }

    // Blockquote
    if (trimmed.startsWith('> ')) {
      flushList();
      elements.push(
        <View key={index} style={styles.blockquote}>
          <Text style={styles.blockquoteText}>{parseInline(trimmed.slice(2))}</Text>
        </View>
      );
      return;
    }

    // Horizontal rule
    if (trimmed === '---' || trimmed === '***') {
      flushList();
      elements.push(<View key={index} style={styles.hr} />);
      return;
    }

    // Regular paragraph
    flushList();
    elements.push(
      <Text key={index} style={styles.paragraph}>{parseInline(trimmed)}</Text>
    );
  });

  // Flush any remaining items
  flushList();
  flushCodeBlock();

  return <View style={[styles.container, style]}>{elements}</View>;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  h1: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#171717',
    marginBottom: 12,
    marginTop: 16,
  },
  h2: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#171717',
    marginBottom: 10,
    marginTop: 14,
  },
  h3: {
    fontSize: 15,
    fontWeight: '600',
    color: '#171717',
    marginBottom: 8,
    marginTop: 12,
  },
  paragraph: {
    fontSize: 14,
    color: '#374151',
    lineHeight: 22,
    marginBottom: 8,
  },
  bold: {
    fontWeight: 'bold',
  },
  italic: {
    fontStyle: 'italic',
  },
  inlineCode: {
    fontFamily: 'monospace',
    backgroundColor: '#F4F4F5',
    paddingHorizontal: 4,
    paddingVertical: 2,
    borderRadius: 3,
    fontSize: 13,
    color: '#DC2626',
  },
  link: {
    color: '#002FA7',
    textDecorationLine: 'underline',
  },
  list: {
    marginBottom: 12,
    paddingLeft: 4,
  },
  listItem: {
    flexDirection: 'row',
    marginBottom: 6,
  },
  bullet: {
    color: '#71717A',
    marginRight: 8,
    fontSize: 14,
  },
  listText: {
    flex: 1,
    fontSize: 14,
    color: '#374151',
    lineHeight: 22,
  },
  codeBlock: {
    backgroundColor: '#1F2937',
    borderRadius: 6,
    padding: 12,
    marginVertical: 8,
  },
  codeText: {
    fontFamily: 'monospace',
    fontSize: 12,
    color: '#E5E7EB',
    lineHeight: 18,
  },
  blockquote: {
    borderLeftWidth: 3,
    borderLeftColor: '#E4E4E7',
    paddingLeft: 12,
    marginVertical: 8,
  },
  blockquoteText: {
    fontSize: 14,
    color: '#71717A',
    fontStyle: 'italic',
  },
  hr: {
    height: 1,
    backgroundColor: '#E4E4E7',
    marginVertical: 16,
  },
});

export default Markdown;
