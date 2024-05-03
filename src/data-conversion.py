import json
import base64
import struct

# Load the tokenizer.json file that was distributed with the LLaMA model
d = None
with open(r"tokenizer.json", 'r', encoding='utf-8') as f:
    d = json.load(f)

# Extract the vocabulary as a list of token strings
vocab = []
for token in d['model']['vocab']:
    vocab.append(token)

# Transform the vocabulary into a UTF-8 String delimited by line breaks, base64 encode it, and save to a file
with open('vocab_base64.txt', 'wb') as f:
    f.write(base64.b64encode(('\n').join(vocab).encode("utf-8")))

# Extract the merge data as a list of strings, where location in list indicates priority of merge.
# Example: one merge might be "gr a" (indicating that "gr" and "a" merge into "gra")
merges = []
for merge in d['model']['merges']:
    merges.append(merge)

# Create helper map where keys are token Strings, values are their positions in the vocab.
# Note that positions of the vocabulary do not have any special meaning in the tokenizer,
# we are merely using them to aid with compressing the data.
vocab_map = {}
for i,v in enumerate(vocab):
    vocab_map[v] = i
    
print(len(vocab_map))

# Each merge can be represented with 2 integers, e.g. "merge the 5th and the 11th token in vocab".
integers = []
for merge in merges:
    f, t = merge.split(" ")
    integers.append(vocab_map[f])
    integers.append(vocab_map[t])

# We are going to compress the merge data into a binary format.
# Since the vocabulary has fewer than 2^17 entries, each integer can be represented with 17 bits.
# The first 2*17 bits define the first merge, the next 2*17 bits define the second merge, and so on.

# First, construct an array of 17-character strings where each character is either '0' or '1'
bit_strings = []
for integer in integers:
    bit_string = bin(integer)[2:]
    bit_string_padded = bit_string.zfill(17)
    bit_strings.append(bit_string_padded)

# We are going to transform the bit_strings array into a combined bit string
# We need the combined bit string to be divisible by 8 in order to convert it to bytes,
# so add a zero-padding-string at the end if needed.
count_bits = 17 * len(bit_strings)
count_needed_padding = count_bits % 8
if count_needed_padding != 0:
    pad_string = '0' * count_needed_padding
    bit_strings.append(pad_string)

# String of zeros and ones, representing all the merges
combined_bit_string = ''.join(bit_strings)

# Partition the string into 8-bit chunks and convert them to ints
int_chunks = [int(combined_bit_string[i:i+8], 2) for i in range(0, len(combined_bit_string), 8)]

# Convert the integer chunks into bytes
byte_chunks = struct.pack(f'{len(int_chunks)}B', *int_chunks)

# Save the byte array as base64 encoded file
with open('merges_binary.bin', 'wb') as file:
    file.write(base64.b64encode(byte_chunks))