import math
import re


def tokenize(text):
    return re.findall(r"\b[a-zA-Z]+\b", text.lower())


def build_vocabulary(chunks):
    vocabulary = {}

    for chunk in chunks:
        for word in tokenize(chunk):
            if word not in vocabulary:
                vocabulary[word] = len(vocabulary)

    return vocabulary


def calculate_tfidf(chunks, vocabulary):
    total_documents = len(chunks)
    document_frequency = [0] * len(vocabulary)

    for chunk in chunks:
        for word in set(tokenize(chunk)):
            if word in vocabulary:
                document_frequency[vocabulary[word]] += 1

    return [
        math.log((total_documents + 1) / (frequency + 1)) + 1
        for frequency in document_frequency
    ]


def create_embedding(chunks):
    vocabulary = build_vocabulary(chunks)
    idf = calculate_tfidf(chunks, vocabulary)

    embeddings = []

    for chunk in chunks:
        vector = [0.0] * len(vocabulary)

        for word in tokenize(chunk):
            if word in vocabulary:
                vector[vocabulary[word]] += 1

        embeddings.append([
            value * idf[index]
            for index, value in enumerate(vector)
        ])

    return embeddings, vocabulary, idf


def create_query_embedding(query, vocabulary, idf):
    vector = [0.0] * len(vocabulary)

    for word in tokenize(query):
        if word in vocabulary:
            vector[vocabulary[word]] += 1

    return [
        value * idf[index]
        for index, value in enumerate(vector)
    ]