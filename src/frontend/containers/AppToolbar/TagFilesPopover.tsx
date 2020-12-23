import React, { ReactNode, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { action, ObservableSet } from 'mobx';
import { observer } from 'mobx-react-lite';

import { ClientFile } from 'src/entities/File';
import { ClientTag } from 'src/entities/Tag';

import StoreContext from '../../contexts/StoreContext';

import useRoveFocus from '../../hooks/useRoveFocus';

import { IconSet } from 'widgets/Icons';
import { ToolbarButton } from 'widgets/menus';
import { Tag } from 'widgets/Tag';

import { countFileTags } from '../../components/FileTag';

import { Tooltip } from './PrimaryCommands';

const TagFilesPopover = observer(() => {
  const { uiStore } = useContext(StoreContext);
  const files = uiStore.fileSelection;
  return (
    <>
      <ToolbarButton
        showLabel="never"
        icon={IconSet.TAG}
        disabled={uiStore.fileSelection.size === 0}
        onClick={uiStore.openToolbarTagPopover}
        text="Tag selected files"
        tooltip={Tooltip.TagFiles}
      />
      <FloatingDialog
        isOpen={uiStore.isToolbarTagPopoverOpen}
        onClose={uiStore.closeToolbarTagPopover}
      >
        <TagFilesWidget
          files={files}
          onDeselect={action((tag) => files.forEach((f) => f.removeTag(tag)))}
          onSelect={action((tag) => files.forEach((f) => f.addTag(tag)))}
        />
      </FloatingDialog>
    </>
  );
});

export default TagFilesPopover;

interface TagItemProps {
  text: string;
  isSelected: boolean;
  color?: string;
  // TODO: color
  onSelect: () => void;
  isFocused: boolean;
  setFocus: (index: number) => void;
  index: number;
}

const TagItem = ({
  text,
  isSelected,
  onSelect,
  isFocused,
  setFocus,
  index,
  color,
}: TagItemProps) => {
  const ref = useRef<HTMLLIElement>(null);
  useEffect(() => {
    const inputFocused = document.activeElement?.matches('input');
    // Move element into view when it is focused
    if (isFocused && !inputFocused) ref.current?.focus();
  }, [isFocused]);

  const handleSelect = () => {
    setFocus(index);
    onSelect();
  };

  return (
    <li
      onClick={handleSelect}
      onKeyPress={(e) => e.key === 'Enter' && handleSelect()}
      tabIndex={isFocused ? 1 : -1}
      role="button"
      ref={ref}
    >
      <span className="tag-item-icon" style={{ color }}>
        {IconSet.TAG}
      </span>
      <span>{text}</span>
      <span className="tag-item-icon">{isSelected ? IconSet.CHECKMARK : null}</span>
    </li>
  );
};

interface TagFilesWidgetProps {
  files: ObservableSet<ClientFile>;
  onSelect: (tag: ClientTag) => void;
  onDeselect: (tag: ClientTag) => void;
}

const TagFilesWidget = observer(({ files, onSelect, onDeselect }: TagFilesWidgetProps) => {
  const { tagStore } = useContext(StoreContext);
  const [inputText, setInputText] = useState('');

  const { counter, sortedTags } = countFileTags(files);
  const [matchingTags, setMatchingTags] = useState([...tagStore.tagListWithoutRoot]);

  const handleInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const text = e.target.value;
      setInputText(e.target.value);

      if (text.length === 0) {
        setMatchingTags([...tagStore.tagListWithoutRoot]);
      } else {
        const textLower = text.toLowerCase();
        const newTagList = tagStore.tagListWithoutRoot.filter((t) =>
          t.name.toLowerCase().includes(textLower),
        );
        setMatchingTags(newTagList);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  const [focus, setFocus] = useRoveFocus(matchingTags.length);

  return (
    <div className="tag-files-widget">
      <div className="input-wrapper">
        <input value={inputText} onChange={handleInput} tabIndex={0} autoFocus />
      </div>
      <ul>
        {matchingTags.map((t, i) => (
          <TagItem
            text={t.name}
            key={t.id}
            isFocused={focus === i}
            setFocus={setFocus}
            isSelected={Boolean(counter.get(t))}
            onSelect={() => (counter.get(t) ? onDeselect(t) : onSelect(t))}
            color={t.viewColor}
            index={i}
          />
        ))}
        {matchingTags.length === 0 && (
          <li>
            <i>{`No tags found matching "${inputText}"`}</i>
          </li>
        )}
      </ul>
      <div className="input-wrapper">
        {sortedTags.map((t) => (
          <Tag
            key={t.id}
            text={`${t.name}${files.size > 1 ? ` (${counter.get(t)})` : ''}`}
            color={t.viewColor}
            onRemove={() => onDeselect(t)}
          />
        ))}
        {sortedTags.length === 0 && <i>No tags added yet</i>}
      </div>
    </div>
  );
});

interface FloatingDialogProps {
  isOpen: boolean;
  onClose: () => void;
  children: ReactNode;
}

const FloatingDialog = (props: FloatingDialogProps) => {
  useEffect(() => {
    const el = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        props.onClose();
        e.preventDefault();
        e.stopPropagation;
      }
    };
    document.addEventListener('keydown', el);
    return () => document.removeEventListener('keydown', el);
  });

  if (!props.isOpen) return null;
  return <div className="floating-dialog">{props.children}</div>;
};
