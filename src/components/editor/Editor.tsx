import React, { forwardRef, useImperativeHandle, useState, useEffect, useRef } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import Image from '@tiptap/extension-image';
import { Bold, Italic, List, ListOrdered, Quote, Undo, Redo, Strikethrough, Code, Heading1, Heading2, Braces, Mic, Volume2, Pen } from 'lucide-react';
import { cn } from '../../lib/utils';

interface EditorProps {
  content: string;
  onChange: (html: string) => void;
  placeholder?: string;
  onAddDrawing?: () => void;
}

export interface EditorRef {
  insertText: (text: string) => void;
  insertImage: (url: string) => void;
}

export const Editor = forwardRef<EditorRef, EditorProps>(({ content, onChange, placeholder = 'Write your thoughts here...', onAddDrawing }, ref) => {
  const [isRecording, setIsRecording] = useState(false);
  const recognitionRef = useRef<any>(null);

  const editor = useEditor({
    extensions: [
      StarterKit,
      Placeholder.configure({
        placeholder,
      }),
      Image,
    ],
    content,
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
  });

  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) return;

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US';

    recognition.onresult = (event: any) => {
      const lastResult = event.results[event.results.length - 1];
      if (lastResult.isFinal) {
        editor?.chain().focus().insertContent(lastResult[0].transcript + ' ').run();
      }
    };

    recognitionRef.current = recognition;

    return () => {
      recognition.stop();
    };
  }, [editor]);

  const toggleRecording = () => {
    if (isRecording) {
      recognitionRef.current?.stop();
    } else {
      recognitionRef.current?.start();
    }
    setIsRecording(!isRecording);
  };

  const readAloud = () => {
    if (!editor) return;
    const text = editor.getText();
    const utterance = new SpeechSynthesisUtterance(text);
    window.speechSynthesis.speak(utterance);
  };

  useImperativeHandle(ref, () => ({
    insertText: (text: string) => {
      if (editor) {
        editor.commands.insertContent(text);
      }
    },
    insertImage: (url: string) => {
      if (editor) {
        editor.commands.setImage({ src: url });
      }
    }
  }));

  if (!editor) {
    return null;
  }

  const MenuButton = ({ 
    onClick, 
    isActive = false, 
    children 
  }: { 
    onClick: () => void; 
    isActive?: boolean; 
    children: React.ReactNode 
  }) => (
    <button
      onClick={onClick}
      className={cn(
        "p-2 rounded-md transition-colors",
        isActive ? "bg-stone-200 text-stone-900" : "text-stone-500 hover:bg-stone-100"
      )}
    >
      {children}
    </button>
  );

  return (
    <div className="flex flex-col h-full">
      <div className="flex flex-wrap items-center gap-1 p-2 border-b border-stone-200 bg-stone-50/50 sticky top-0 z-10 backdrop-blur-sm">
        <MenuButton 
          onClick={() => editor.chain().focus().toggleBold().run()}
          isActive={editor.isActive('bold')}
        >
          <Bold className="w-4 h-4" />
        </MenuButton>
        <MenuButton 
          onClick={() => editor.chain().focus().toggleItalic().run()}
          isActive={editor.isActive('italic')}
        >
          <Italic className="w-4 h-4" />
        </MenuButton>
        <MenuButton 
          onClick={() => editor.chain().focus().toggleStrike().run()}
          isActive={editor.isActive('strike')}
        >
          <Strikethrough className="w-4 h-4" />
        </MenuButton>
        <MenuButton 
          onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
          isActive={editor.isActive('heading', { level: 1 })}
        >
          <Heading1 className="w-4 h-4" />
        </MenuButton>
        <MenuButton 
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
          isActive={editor.isActive('heading', { level: 2 })}
        >
          <Heading2 className="w-4 h-4" />
        </MenuButton>
        <MenuButton 
          onClick={() => editor.chain().focus().toggleCode().run()}
          isActive={editor.isActive('code')}
        >
          <Code className="w-4 h-4" />
        </MenuButton>
        <MenuButton 
          onClick={() => editor.chain().focus().toggleCodeBlock().run()}
          isActive={editor.isActive('codeBlock')}
        >
          <Braces className="w-4 h-4" />
        </MenuButton>
        <MenuButton 
          onClick={toggleRecording}
          isActive={isRecording}
        >
          <Mic className={cn("w-4 h-4", isRecording ? "text-red-500 animate-pulse" : "")} />
        </MenuButton>
        <MenuButton onClick={readAloud}>
          <Volume2 className="w-4 h-4" />
        </MenuButton>
        {onAddDrawing && (
          <MenuButton onClick={onAddDrawing}>
            <Pen className="w-4 h-4" />
          </MenuButton>
        )}
        <div className="w-px h-6 bg-stone-200 mx-1" />
        <MenuButton 
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          isActive={editor.isActive('bulletList')}
        >
          <List className="w-4 h-4" />
        </MenuButton>
        <MenuButton 
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          isActive={editor.isActive('orderedList')}
        >
          <ListOrdered className="w-4 h-4" />
        </MenuButton>
        <MenuButton 
          onClick={() => editor.chain().focus().toggleBlockquote().run()}
          isActive={editor.isActive('blockquote')}
        >
          <Quote className="w-4 h-4" />
        </MenuButton>
        <div className="flex-1" />
        <MenuButton onClick={() => editor.chain().focus().undo().run()}>
          <Undo className="w-4 h-4" />
        </MenuButton>
        <MenuButton onClick={() => editor.chain().focus().redo().run()}>
          <Redo className="w-4 h-4" />
        </MenuButton>
      </div>
      <EditorContent 
        editor={editor} 
        className="flex-1 prose prose-stone max-w-none p-4 focus:outline-none overflow-y-auto min-h-[300px]"
      />
    </div>
  );
});
