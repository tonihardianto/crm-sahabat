const EMOJIS = [
    // Wajah
    '😀','😃','😄','😁','😆','😅','😂','🤣','😊','😇',
    '🙂','🙃','😉','😌','😍','🥰','😘','😗','😙','😚',
    '😋','😛','😜','🤪','😝','🤑','🤗','🤭','🤫','🤔',
    '🤐','🤨','😐','😑','😶','😏','😒','🙄','😬','🤥',
    '😔','😪','🤤','😴','😷','🤒','🤕','🤢','🤧','🥵',
    '😩','😫','🥱','😤','😠','😡','🤬','😈','👿','💀',
    // Gestur
    '👍','👎','👊','✊','🤛','🤜','🤞','✌️','🤟','🤘',
    '👌','🤌','🤏','👈','👉','👆','👇','☝️','✋','🤚',
    '🖐️','🖖','👋','🤙','💪','🦵','🦶','👏','🙌','🤝',
    '🙏','✍️','💅','🤳',
    // Hati & simbol
    '❤️','🧡','💛','💚','💙','💜','🖤','🤍','🤎','💔',
    '❤️‍🔥','💕','💞','💓','💗','💖','💘','💝','💟','☮️',
    '✅','❌','⭐','🔥','💯','🎉','🎊','🥳','🎁','🏆',
    // Alam & objek
    '☀️','🌙','⭐','🌈','☁️','⚡','❄️','🌸','🌺','🌻',
    '🍎','🍊','🍋','🍇','🍓','🍕','🍔','🎂','☕','🧋',
    // Aktivitas
    '😴','💤','👀','💬','💭','🗣️','📱','💻','📷','🎵',
];

interface Props {
    onSelect: (emoji: string) => void;
}

export function EmojiPicker({ onSelect }: Props) {
    return (
        <div className="grid grid-cols-10 gap-0.5 p-2 max-h-[220px] overflow-y-auto">
            {EMOJIS.map((emoji, i) => (
                <button
                    key={i}
                    type="button"
                    onClick={() => onSelect(emoji)}
                    className="text-lg w-8 h-8 flex items-center justify-center rounded hover:bg-accent transition-colors"
                >
                    {emoji}
                </button>
            ))}
        </div>
    );
}
