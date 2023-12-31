import torch
from transformers import GPT2LMHeadModel, GPT2Tokenizer
import sys
import os

# Load the model and tokenizer once and keep them ready for inference
tokenizer = GPT2Tokenizer.from_pretrained("gpt2")
model = GPT2LMHeadModel.from_pretrained("gpt2")

def generate_text(prompt, max_length=100, temperature=0.7, top_p=0.9):
    """
    Generates text from a prompt using the GPT-2 model.
    
    Parameters:
    - prompt (str): The prompt to generate text from.
    - max_length (int): The maximum length of the sequence to be generated.
    - temperature (float): The value used to module the next token probabilities.
    - top_p (float): The cumulative probability for parameter of nucleus sampling.
    
    Returns:
    - str: The generated text.
    """
    try:
        # Encode the prompt into tokens
        inputs = tokenizer.encode(prompt, return_tensors="pt")
        attention_mask = torch.ones(inputs.shape, dtype=torch.long)

        # Generate text sequences
        outputs = model.generate(
            inputs, 
            attention_mask=attention_mask, 
            max_length=max_length, 
            num_return_sequences=1, 
            temperature=temperature, 
            top_p=top_p, 
            do_sample=True
        )

        # Decode the output tokens to a string
        generated_text = tokenizer.decode(outputs[0], skip_special_tokens=True)
        return generated_text
    except Exception as e:
        # If an error occurs, print it out and exit the script with an error code
        print(f"An error occurred: {e}", file=sys.stderr)
        sys.exit(1)

if __name__ == "__main__":
    # Get the prompt from command line arguments
    if len(sys.argv) < 2:
        print("You must provide a prompt for text generation.", file=sys.stderr)
        sys.exit(1)
    
    prompt = sys.argv[1]
    generated_text = generate_text(prompt)
    print(generated_text)
