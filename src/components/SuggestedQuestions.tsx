type Props = {
  label: string;
  questions: readonly string[];
  onSelect: (question: string) => void;
};

export function SuggestedQuestions({ label, questions, onSelect }: Props) {
  return (
    <div aria-label={label} className="starter-list" role="group">
      {questions.map((question) => (
        <button
          className="starter-button"
          key={question}
          onClick={() => onSelect(question)}
          type="button"
        >
          {question}
        </button>
      ))}
    </div>
  );
}
